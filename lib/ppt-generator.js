/**
 * ppt-generator.js v3 — 画语小精灵 教育PPT生成器
 * 纯 JSZip + 原生 OpenXML
 * 解析AI教案 → 按章节分页 → 生成可编辑PPTX
 */

'use strict';

// ========== 教案文本解析（简化稳健版） ==========
function parseLessonPlan(text) {
  const data = { title: '', grade: '', lessonType: '', slides: [] };

  // 提取标题
  let m = text.match(/《(.+?)》/) || text.match(/课题名称[：:]\s*(.+)/) || text.match(/#+\s*(.+)/);
  if (m) data.title = m[1].replace(/教学设计$/, '').trim();
  if (!data.title) data.title = '美术课教学设计';

  m = text.match(/年级[：:]\s*(.+)/);
  if (m) data.grade = m[1].trim();

  m = text.match(/课型[：:]\s*(.+)/);
  if (m) data.lessonType = m[1].trim();

  // 按章节标题拆分内容
  const sectionMarkers = [
    '教材分析', '学情分析', '教学目标', '教学重难点', '教学准备',
    '教学过程', '评价设计', '板书设计', '课后反思'
  ];

  // 找所有章节标记位置
  const positions = [];
  sectionMarkers.forEach(name => {
    const patterns = [
      new RegExp(`[一二三四五六七八九][、.]\\s*${name}`),
      new RegExp(`\\d+[、.]\\s*${name}`),
      new RegExp(`##\\s*.*${name}`),
      new RegExp(`${name}[：:]`)
    ];
    for (const pat of patterns) {
      const match = text.match(pat);
      if (match) {
        positions.push({ name, idx: match.index });
        break;
      }
    }
  });
  positions.sort((a, b) => a.idx - b.idx);

  // 提取每段内容
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    let content = text.slice(start, end).trim();
    // 截断过长的内容
    if (content.length > 2000) content = content.slice(0, 2000) + '\n\n（内容过长，已截断）';
    data.slides.push({
      title: positions[i].name,
      content: content
    });
  }

  // 如果没解析到任何章节，将全文分成几段
  if (data.slides.length === 0) {
    const chunks = text.split(/\n{3,}/);
    const titles = ['教案内容'];
    chunks.forEach((chunk, i) => {
      if (chunk.trim() && i < 8) {
        data.slides.push({
          title: i === 0 ? '教案内容' : `详细内容 (${i + 1})`,
          content: chunk.trim().slice(0, 2000)
        });
      }
    });
  }

  // 确保至少有一些内容
  if (data.slides.length === 0) {
    data.slides.push({ title: '教案内容', content: text.slice(0, 2000) });
  }

  return data;
}

// ========== XML生成 ==========
function escXml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Unicode BMP字符可以安全放在XML中
// 控制字符需要移除
function safeText(s) {
  if (!s) return '';
  return String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

// ========== 幻灯片XML ==========

// 封面
function makeCoverXml(title, subtitle) {
  const t = escXml(safeText(title));
  const sub = escXml(safeText(subtitle || ''));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:sp><p:nvSpPr><p:cNvPr id="1" name="Bar"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" y="80000"/></a:xfrm>
<a:solidFill><a:srgbClr val="E8783B"/></a:solidFill></p:spPr></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="1000000" y="2000000"/><a:ext cx="10200000" cy="1400000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/>
<a:p><a:r><a:rPr lang="zh-CN" sz="3600" b="1"><a:solidFill><a:srgbClr val="E8783B"/></a:solidFill></a:rPr><a:t>${t}</a:t></a:r></a:p>
</p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Sub"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="1000000" y="3600000"/><a:ext cx="10200000" cy="600000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/>
<a:p><a:r><a:rPr lang="zh-CN" sz="1600"><a:solidFill><a:srgbClr val="A0988C"/></a:solidFill></a:rPr><a:t>${sub}</a:t></a:r></a:p>
</p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="4" name="Footer"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="1000000" y="5000000"/><a:ext cx="10200000" cy="400000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/>
<a:p><a:r><a:rPr lang="zh-CN" sz="1000"><a:solidFill><a:srgbClr val="A0988C"/></a:solidFill></a:rPr><a:t>画语小精灵 · 小学美术教学智能助手</a:t></a:r></a:p>
</p:txBody></p:sp>
</p:cSld></p:sld>`;
}

// 内容页
function makeContentXml(slideTitle, bodyText, accentColor, slideNum) {
  const title = escXml(safeText(slideTitle));
  // 将正文按行拆分，每行作为一个文本段落
  const lines = safeText(bodyText).split('\n').filter(l => l.trim());
  const color = accentColor || 'E8783B';

  // 构建段落XML
  let parasXml = '';
  lines.forEach((line, i) => {
    if (i >= 25) return; // 最多25行
    const l = escXml(line.trim());
    if (!l) return;
    // 检测标题行（如 **xxx** 或 ## xxx）
    const isBold = /^\*\*.*\*\*$/.test(line.trim()) || /^【.*】$/.test(line.trim());
    const sz = isBold ? '1600' : '1300';
    const b = isBold ? ' b="1"' : '';
    parasXml += `<a:p><a:r><a:rPr lang="zh-CN" sz="${sz}"${b}><a:solidFill><a:srgbClr val="2D2D2D"/></a:solidFill></a:rPr><a:t>${l}</a:t></a:r></a:p>`;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:sp><p:nvSpPr><p:cNvPr id="1" name="TopBar"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" y="50000"/></a:xfrm>
<a:solidFill><a:srgbClr val="${color}"/></a:solidFill></p:spPr></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="700000" y="250000"/><a:ext cx="10800000" cy="650000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/>
<a:p><a:r><a:rPr lang="zh-CN" sz="2400" b="1"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${title}</a:t></a:r></a:p>
</p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="700000" y="1100000"/><a:ext cx="10800000" cy="5400000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>
${parasXml}
</p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="4" name="Footer"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="700000" y="6600000"/><a:ext cx="10800000" cy="200000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/>
<a:p><a:r><a:rPr lang="zh-CN" sz="800"><a:solidFill><a:srgbClr val="A0988C"/></a:solidFill></a:rPr><a:t>画语小精灵 · 小学美术教学智能助手</a:t></a:r></a:p>
</p:txBody></p:sp>
</p:cSld></p:sld>`;
}

// 结束页
function makeEndXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:sp><p:nvSpPr><p:cNvPr id="1" name="Bar"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" y="80000"/></a:xfrm>
<a:solidFill><a:srgbClr val="E8783B"/></a:solidFill></p:spPr></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Thanks"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="2000000" y="2200000"/><a:ext cx="8200000" cy="1600000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/>
<a:p><a:r><a:rPr lang="zh-CN" sz="4000" b="1"><a:solidFill><a:srgbClr val="E8783B"/></a:solidFill></a:rPr><a:t>感谢聆听</a:t></a:r></a:p>
</p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Tag"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="2000000" y="4000000"/><a:ext cx="8200000" cy="500000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/>
<a:p><a:r><a:rPr lang="zh-CN" sz="1400"><a:solidFill><a:srgbClr val="A0988C"/></a:solidFill></a:rPr><a:t>用画笔表达世界 · 用美育滋养心灵</a:t></a:r></a:p>
</p:txBody></p:sp>
</p:cSld></p:sld>`;
}

// ========== PPTX公共XML ==========
function buildContentTypes(slideCount) {
  let types = '';
  for (let i = 1; i <= slideCount; i++) {
    types += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${types}</Types>`;
}

function buildPresentationXml(slideCount) {
  let ids = '';
  let rels = '';
  for (let i = 1; i <= slideCount; i++) {
    ids += `<p:sldId id="${255 + i}" r:id="rId${i}"/>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster"/></p:sldMasterIdLst>
<p:sldIdLst>${ids}</p:sldIdLst>
<p:sldSz cx="12192000" cy="6858000"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
}

function buildPresRels(slideCount) {
  let rels = `<Relationship Id="rIdMaster" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>\n`;
  rels += `<Relationship Id="rIdTheme" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>\n`;
  for (let i = 1; i <= slideCount; i++) {
    rels += `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

const SLIDE_MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:cSld></p:sldMaster>`;

const SLIDE_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld name="Blank"/></p:sldLayout>`;

const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Edu">
<a:themeElements>
<a:clrScheme name="Edu">
<a:dk1><a:srgbClr val="2D2D2D"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="E8783B"/></a:dk2><a:lt2><a:srgbClr val="FEF9F4"/></a:lt2>
<a:accent1><a:srgbClr val="E8783B"/></a:accent1><a:accent2><a:srgbClr val="F4A261"/></a:accent2>
<a:accent3><a:srgbClr val="457B9D"/></a:accent3><a:accent4><a:srgbClr val="52B788"/></a:accent4>
<a:accent5><a:srgbClr val="E9C46A"/></a:accent5><a:accent6><a:srgbClr val="A0988C"/></a:accent6>
<a:hlink><a:srgbClr val="457B9D"/></a:hlink><a:folHlink><a:srgbClr val="E8783B"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Edu"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/></a:majorFont>
<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="Edu"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
</a:fmtScheme></a:themeElements></a:theme>`;

// ========== JSZip打包 ==========
async function buildZip(slidesXml, filename) {
  const zip = new JSZip();
  const slideCount = slidesXml.length;

  // [Content_Types].xml
  zip.file('[Content_Types].xml', buildContentTypes(slideCount));

  // _rels/.rels
  const rels = zip.folder('_rels');
  rels.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  // ppt/presentation.xml
  const ppt = zip.folder('ppt');
  ppt.file('presentation.xml', buildPresentationXml(slideCount));

  // ppt/_rels/presentation.xml.rels
  const pptRels = ppt.folder('_rels');
  pptRels.file('presentation.xml.rels', buildPresRels(slideCount));

  // ppt/slides/
  const slides = ppt.folder('slides');
  slidesXml.forEach((xml, i) => {
    slides.file(`slide${i + 1}.xml`, xml);
  });

  // ppt/slideMasters/
  const masters = ppt.folder('slideMasters');
  masters.file('slideMaster1.xml', SLIDE_MASTER);
  const masterRels = masters.folder('_rels');
  masterRels.file('slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);

  // ppt/slideLayouts/
  const layouts = ppt.folder('slideLayouts');
  layouts.file('slideLayout1.xml', SLIDE_LAYOUT);
  const layoutRels = layouts.folder('_rels');
  layoutRels.file('slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);

  // ppt/theme/
  ppt.folder('theme').file('theme1.xml', THEME);

  return zip;
}

// ========== 公开API ==========
const EduPPTGenerator = {
  async generate(lessonPlanText, filename) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip 未加载，请刷新页面后重试');
    }

    const data = parseLessonPlan(lessonPlanText);
    const accentColors = ['E8783B', 'F4A261', '457B9D', '52B788', 'E9C46A'];

    // 构建幻灯片列表
    const slidesXml = [];

    // 封面
    const subtitle = [data.grade, data.lessonType].filter(Boolean).join(' · ');
    slidesXml.push(makeCoverXml(data.title, subtitle));

    // 内容页
    data.slides.forEach((slide, i) => {
      const color = accentColors[i % accentColors.length];
      slidesXml.push(makeContentXml(slide.title, slide.content, color, i));
    });

    // 结束页
    slidesXml.push(makeEndXml());

    // 打包
    const zip = await buildZip(slidesXml, filename);
    const fname = (filename || data.title || '教案') + '.pptx';
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

    // 触发下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);

    return { success: true, slideCount: slidesXml.length, filename: fname };
  },

  parseLessonPlan
};

window.EduPPTGenerator = EduPPTGenerator;
