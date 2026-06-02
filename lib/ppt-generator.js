/**
 * ppt-generator.js — 画语小精灵 教育PPT生成器 v2
 * 纯 JSZip + 原生 OpenXML 生成可编辑 PPTX
 * 不依赖 PptxGenJS
 */

'use strict';

// ========== 配色方案 ==========
const EDU_COLORS = {
  primary: 'E8783B',
  secondary: 'F4A261',
  accent: '457B9D',
  success: '52B788',
  warm: 'E9C46A',
  dark: '2D2D2D',
  light: 'FEF9F4',
  white: 'FFFFFF',
  muted: 'A0988C'
};

// ========== 教案文本解析 ==========
function parseLessonPlan(text) {
  const data = { title: '', grade: '', lessonType: '', sections: {} };

  const titleMatch = text.match(/课题名称[：:]\s*(.+)/) || text.match(/《(.+?)》教学设计/) || text.match(/^#+\s*(.+)/m);
  if (titleMatch) data.title = titleMatch[1].replace(/《|》/g, '').trim();

  const gradeMatch = text.match(/适用年级[：:]\s*(.+)/) || text.match(/年级[：:]\s*(.+)/);
  if (gradeMatch) data.grade = gradeMatch[1].trim();

  const typeMatch = text.match(/课型[：:]\s*(.+)/);
  if (typeMatch) data.lessonType = typeMatch[1].trim();

  // 按章节标题切分
  const sectionPatterns = [
    { key: 'objectives', pattern: /(?:三[、.）]|3[、.）])\s*教学目标[\s\S]*?(?=(?:四[、.）]|4[、.）])\s*教学重难点|$)/ },
    { key: 'keypoints', pattern: /(?:四[、.）]|4[、.）])\s*教学重难点[\s\S]*?(?=(?:五[、.）]|5[、.）])\s*教学准备|$)/ },
    { key: 'process', pattern: /(?:六[、.）]|6[、.）])\s*教学过程[\s\S]*?(?=(?:七[、.）]|7[、.）])\s*评价设计|$)/ },
    { key: 'evaluation', pattern: /(?:七[、.）]|7[、.）])\s*评价设计[\s\S]*?(?=(?:八[、.）]|8[、.）])\s*板书设计|$)/ },
    { key: 'blackboard', pattern: /(?:八[、.）]|8[、.）])\s*板书设计[\s\S]*?(?=(?:九[、.）]|9[、.）])\s*课后反思|$)/ }
  ];

  sectionPatterns.forEach(sp => {
    const match = text.match(sp.pattern);
    if (match) data.sections[sp.key] = match[0].trim().slice(0, 800);
  });

  // 解析教学过程各环节
  if (data.sections.process) {
    const phaseNames = ['激趣导入', '探究新知', '实践创作', '展评拓展', '总结反馈'];
    const chunks = data.sections.process.split(/环节[一二三四五六七八九十][：:]/);
    data._phases = [];
    for (let i = 1; i < chunks.length && i <= 5; i++) {
      data._phases.push({ name: phaseNames[i-1] || `环节${i}`, content: chunks[i].trim().slice(0, 500) });
    }
  }

  return data;
}

// ========== OpenXML 工具函数 ==========
function escXml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function EMU(cm) { return Math.round(cm * 360000); } // cm to EMU

// ========== PPTX XML 模板 ==========
const PPTX_TEMPLATES = {
  // [Content_Types].xml
  contentTypes: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  {SLIDE_TYPES}
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>
</Types>`,

  // _rels/.rels
  rootRels: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,

  // ppt/_rels/presentation.xml.rels
  pptRels: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml"/>
  {SLIDE_RELS}
</Relationships>`,

  // ppt/presentation.xml
  presentation: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>{SLIDE_IDS}</p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`
};

// ========== 单张幻灯片 XML 生成 ==========
function makeSlideXml(title, bodyLines, color, slideNum) {
  const titleSafe = escXml(title);
  let bodyXml = '';
  if (bodyLines && bodyLines.length > 0) {
    const lines = bodyLines.map(l => escXml(l.slice(0, 200))).join('</a:t></a:r><a:r><a:rPr lang="zh-CN" sz="1400"/><a:t>');
    bodyXml = `<p:sp><p:nvSpPr><p:cNvPr id="${slideNum+1}" name="Body"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="800000" y="1200000"/><a:ext cx="10600000" cy="5000000"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr wrap="square" rtlCol="0"/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1400"><a:solidFill><a:srgbClr val="2D2D2D"/></a:solidFill></a:rPr><a:t>${lines}</a:t></a:r></a:p></p:txBody></p:sp>`;
  }

  // 顶部色条
  const barXml = `<p:sp><p:nvSpPr><p:cNvPr id="${slideNum+2}" name="AccentBar"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" y="60000"/></a:xfrm><a:solidFill><a:srgbClr val="${color || EDU_COLORS.primary}"/></a:solidFill></p:spPr></p:sp>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>${barXml}
    <p:sp><p:nvSpPr><p:cNvPr id="${slideNum}" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="600000" y="250000"/><a:ext cx="11000000" cy="700000"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="2400" b="1"><a:solidFill><a:srgbClr val="${color || EDU_COLORS.primary}"/></a:solidFill></a:rPr><a:t>${titleSafe}</a:t></a:r></a:p></p:txBody></p:sp>
    ${bodyXml}
  </p:cSld>
</p:sld>`;
}

function makeCoverSlideXml(title, subtitle, color) {
  const titleSafe = escXml(title || '美术课教学设计');
  const subSafe = escXml(subtitle || '');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:sp><p:nvSpPr><p:cNvPr id="1" name="AccentBar"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" y="80000"/></a:xfrm><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></p:spPr></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="2" name="SideBar"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="400000" cy="6858000"/></a:xfrm><a:solidFill><a:srgbClr val="${color}"><a:alpha val="15000"/></a:srgbClr></a:solidFill></p:spPr></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="3" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="1300000" y="1800000"/><a:ext cx="10000000" cy="1500000"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="3600" b="1"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>《${titleSafe}》</a:t></a:r></a:p><a:p><a:r><a:rPr lang="zh-CN" sz="3600" b="1"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>教学设计</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="4" name="Subtitle"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="1300000" y="3500000"/><a:ext cx="10000000" cy="600000"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1600"><a:solidFill><a:srgbClr val="A0988C"/></a:solidFill></a:rPr><a:t>${subSafe}</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="5" name="Footer"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="1300000" y="5000000"/><a:ext cx="10000000" cy="400000"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1000"><a:solidFill><a:srgbClr val="A0988C"/></a:solidFill></a:rPr><a:t>基于《义务教育艺术课程标准（2022年版）》| 画语小精灵</a:t></a:r></a:p></p:txBody></p:sp>
  </p:cSld>
</p:sld>`;
}

function makeEndSlideXml(color) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:sp><p:nvSpPr><p:cNvPr id="1" name="Bar"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" y="80000"/></a:xfrm><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></p:spPr></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="2" name="Thanks"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="1500000" y="2400000"/><a:ext cx="9200000" cy="1500000"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="4000" b="1"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>感谢聆听</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="3" name="Tagline"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="1500000" y="4200000"/><a:ext cx="9200000" cy="500000"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1400"><a:solidFill><a:srgbClr val="A0988C"/></a:solidFill></a:rPr><a:t>用画笔表达世界 · 用美育滋养心灵</a:t></a:r></a:p></p:txBody></p:sp>
  </p:cSld>
</p:sld>`;
}

// ========== 公共文件内容 ==========
const PPTX_COMMON = {
  // ppt/slideMasters/slideMaster1.xml
  slideMaster: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:cSld>
</p:sldMaster>`,

  // ppt/slideLayouts/slideLayout1.xml
  slideLayout: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="title">
  <p:cSld name="Title Slide"/></p:sldLayout>`,

  // ppt/theme/theme1.xml (minimal)
  theme: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Edu Theme">
  <a:themeElements>
    <a:clrScheme name="Edu">
      <a:dk1><a:srgbClr val="2D2D2D"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="E8783B"/></a:dk2><a:lt2><a:srgbClr val="FEF9F4"/></a:lt2>
      <a:accent1><a:srgbClr val="E8783B"/></a:accent1><a:accent2><a:srgbClr val="F4A261"/></a:accent2>
      <a:accent3><a:srgbClr val="457B9D"/></a:accent3><a:accent4><a:srgbClr val="52B788"/></a:accent4>
      <a:accent5><a:srgbClr val="E9C46A"/></a:accent5><a:accent6><a:srgbClr val="A0988C"/></a:accent6>
      <a:hlink><a:srgbClr val="457B9D"/></a:hlink><a:folHlink><a:srgbClr val="E8783B"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Edu"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Edu"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`,

  // ppt/notesMasters/notesMaster1.xml
  notesMaster: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`
};

// ========== 主生成函数 ==========
function buildPPTX(data) {
  const slides = [];
  const color = EDU_COLORS.primary;

  // Slide 1: 封面
  const subInfo = [data.grade, data.lessonType].filter(Boolean).join(' · ');
  slides.push(makeCoverSlideXml(data.title || '美术课教学设计', subInfo, color));

  // Slide 2: 教学目标
  if (data.sections.objectives) {
    const lines = data.sections.objectives.split('\n').filter(l => l.trim()).slice(0, 15);
    slides.push(makeSlideXml('🎯 教学目标', lines, color, 10));
  }

  // Slide 3: 教学重难点
  if (data.sections.keypoints) {
    const lines = data.sections.keypoints.split('\n').filter(l => l.trim()).slice(0, 12);
    slides.push(makeSlideXml('📌 教学重难点', lines, color, 20));
  }

  // Slides 4-8: 教学过程
  if (data._phases && data._phases.length > 0) {
    const phaseColors = [EDU_COLORS.primary, EDU_COLORS.secondary, EDU_COLORS.accent, EDU_COLORS.success, EDU_COLORS.warm];
    data._phases.forEach((phase, i) => {
      if (i >= 5) return;
      const lines = phase.content.split('\n').filter(l => l.trim()).slice(0, 12);
      // 如果行数少，添加教学流程框架
      if (lines.length < 3) {
        lines.push('🕐 教学活动：', '📢 教师行为：', '👀 设计意图：');
      }
      slides.push(makeSlideXml(`环节${i+1}：${phase.name}`, lines, phaseColors[i] || color, 30 + i * 10));
    });
  }

  // 评价设计
  if (data.sections.evaluation) {
    const lines = data.sections.evaluation.split('\n').filter(l => l.trim()).slice(0, 12);
    slides.push(makeSlideXml('📊 评价设计', lines, EDU_COLORS.success, 80));
  }

  // 板书设计
  if (data.sections.blackboard) {
    const lines = data.sections.blackboard.split('\n').filter(l => l.trim()).slice(0, 10);
    slides.push(makeSlideXml('💡 板书设计', lines, EDU_COLORS.accent, 90));
  }

  // 结束页
  slides.push(makeEndSlideXml(color));

  return slides;
}

// ========== 使用 JSZip 打包 PPTX ==========
function generatePPTX(data, filename) {
  const slides = buildPPTX(data);

  // 构建 Content_Types.xml 中的 slide 条目
  let slideTypes = '';
  let slideRels = '';
  let slideIds = '';
  for (let i = 0; i < slides.length; i++) {
    const num = i + 1;
    slideTypes += `  <Override PartName="/ppt/slides/slide${num}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n`;
    slideRels += `  <Relationship Id="rId${num+3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${num}.xml"/>\n`;
    slideIds += `    <p:sldId id="${255+num}" r:id="rId${num+3}"/>\n`;
  }

  // 替换模板中的占位符
  function fill(template, replacements) {
    let result = template;
    for (const [key, val] of Object.entries(replacements)) {
      result = result.replace(`{${key}}`, val);
    }
    return result;
  }

  // 创建 zip
  const zip = new JSZip();

  // 根目录文件
  zip.file('[Content_Types].xml', fill(PPTX_TEMPLATES.contentTypes, { SLIDE_TYPES: slideTypes }));

  // _rels
  const relsFolder = zip.folder('_rels');
  relsFolder.file('.rels', PPTX_TEMPLATES.rootRels);

  // ppt
  const pptFolder = zip.folder('ppt');
  pptFolder.file('presentation.xml', fill(PPTX_TEMPLATES.presentation, { SLIDE_IDS: slideIds }));

  // ppt/_rels
  const pptRelsFolder = pptFolder.folder('_rels');
  pptRelsFolder.file('presentation.xml.rels', fill(PPTX_TEMPLATES.pptRels, { SLIDE_RELS: slideRels }));

  // ppt/slides
  const slidesFolder = pptFolder.folder('slides');
  for (let i = 0; i < slides.length; i++) {
    slidesFolder.file(`slide${i+1}.xml`, slides[i]);
  }

  // ppt/slideMasters
  const mastersFolder = pptFolder.folder('slideMasters');
  mastersFolder.file('slideMaster1.xml', PPTX_COMMON.slideMaster);
  mastersFolder.folder('_rels').file('slideMaster1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`);

  // ppt/slideLayouts
  const layoutsFolder = pptFolder.folder('slideLayouts');
  layoutsFolder.file('slideLayout1.xml', PPTX_COMMON.slideLayout);
  layoutsFolder.folder('_rels').file('slideLayout1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);

  // ppt/theme
  const themeFolder = pptFolder.folder('theme');
  themeFolder.file('theme1.xml', PPTX_COMMON.theme);

  // ppt/notesMasters
  const notesFolder = pptFolder.folder('notesMasters');
  notesFolder.file('notesMaster1.xml', PPTX_COMMON.notesMaster);
  notesFolder.folder('_rels').file('notesMaster1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/></Relationships>`);

  // ppt/notesSlides (required)
  const notesSlidesFolder = pptFolder.folder('notesSlides');
  notesSlidesFolder.file('notesSlide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notesSlide xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:sp><p:nvSpPr><p:cNvPr id="1" name="Notes"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6858000" cy="9144000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp></p:cSld></p:notesSlide>`);
  notesSlidesFolder.folder('_rels').file('notesSlide1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/></Relationships>`);

  // docProps (required by some PPT viewers)
  const docPropsFolder = zip.folder('docProps');
  docPropsFolder.file('app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>画语小精灵</Application><Slides>${slides.length}</Slides></Properties>`);
  docPropsFolder.file('core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"><dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">画语小精灵</dc:creator></cp:coreProperties>`);

  return zip;
}

// ========== 公开 API ==========
const EduPPTGenerator = {
  async generate(lessonPlanText, filename) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip 库未加载，请刷新页面后重试');
    }

    const data = parseLessonPlan(lessonPlanText);
    if (!data.title) data.title = '美术课教学设计';

    const zip = generatePPTX(data, filename);
    const fname = (filename || data.title || '教案') + '.pptx';

    // 生成 blob 并触发下载
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const slideCount = Object.keys(zip.files).filter(k => k.startsWith('ppt/slides/slide') && k.endsWith('.xml')).length;
    return { success: true, slideCount, filename: fname };
  },

  parseLessonPlan,
  buildPPTX,
  generatePPTX
};

window.EduPPTGenerator = EduPPTGenerator;
