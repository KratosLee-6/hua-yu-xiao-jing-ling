/**
 * ppt-generator.js — 画语小精灵 教育PPT生成器
 * 依赖 PptxGenJS (pptxgen.bundle.js)
 * 将AI生成的教案解析为结构化PPTX幻灯片
 */

'use strict';

// ========== 配色方案 ==========
const EDU_COLORS = {
  primary: 'E8783B',      // 暖橙
  secondary: 'F4A261',    // 浅橙
  accent: '457B9D',       // 沉稳蓝
  success: '52B788',      // 绿
  warm: 'E9C46A',         // 暖黄
  dark: '2D2D2D',         // 深灰文字
  light: 'FEF9F4',        // 暖白背景
  white: 'FFFFFF',
  muted: 'A0988C'
};

const EDU_FONTS = {
  title: { fontFace: 'Microsoft YaHei', fontSize: 28, color: EDU_COLORS.primary, bold: true },
  subtitle: { fontFace: 'Microsoft YaHei', fontSize: 14, color: EDU_COLORS.muted },
  heading: { fontFace: 'Microsoft YaHei', fontSize: 18, color: EDU_COLORS.primary, bold: true },
  body: { fontFace: 'Microsoft YaHei', fontSize: 12, color: EDU_COLORS.dark },
  small: { fontFace: 'Microsoft YaHei', fontSize: 10, color: EDU_COLORS.muted }
};

// ========== 教案文本解析 ==========
function parseLessonPlan(text) {
  // 从AI生成的教案文本中提取结构化数据
  const data = {
    title: '',
    grade: '',
    lessonType: '',
    sections: {}
  };

  // 提取课题
  const titleMatch = text.match(/课题名称[：:]\s*(.+)/) || text.match(/《(.+?)》教学设计/) || text.match(/^#+\s*(.+)/m);
  if (titleMatch) data.title = titleMatch[1].replace(/《|》/g, '').trim();

  // 提取年级
  const gradeMatch = text.match(/适用年级[：:]\s*(.+)/) || text.match(/年级[：:]\s*(.+)/);
  if (gradeMatch) data.grade = gradeMatch[1].trim();

  // 提取课型
  const typeMatch = text.match(/课型[：:]\s*(.+)/);
  if (typeMatch) data.lessonType = typeMatch[1].trim();

  // 按章节标题切分
  const sectionPatterns = [
    { key: 'textbook', pattern: /(?:一[、.）]|1[、.）])\s*教材分析/ },
    { key: 'students', pattern: /(?:二[、.）]|2[、.）])\s*学情分析/ },
    { key: 'objectives', pattern: /(?:三[、.）]|3[、.）])\s*教学目标/ },
    { key: 'keypoints', pattern: /(?:四[、.）]|4[、.）])\s*教学重难点/ },
    { key: 'preparation', pattern: /(?:五[、.）]|5[、.）])\s*教学准备/ },
    { key: 'process', pattern: /(?:六[、.）]|6[、.）])\s*教学过程/ },
    { key: 'evaluation', pattern: /(?:七[、.）]|7[、.）])\s*评价设计/ },
    { key: 'blackboard', pattern: /(?:八[、.）]|8[、.）])\s*板书设计/ },
    { key: 'reflection', pattern: /(?:九[、.）]|9[、.）])\s*课后反思/ }
  ];

  let remaining = text;
  const positions = [];

  sectionPatterns.forEach(sp => {
    const match = remaining.match(sp.pattern);
    if (match) {
      positions.push({ key: sp.key, start: match.index });
    }
  });

  positions.sort((a, b) => a.start - b.start);

  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    const next = positions[i + 1];
    const startIdx = current.start;
    const endIdx = next ? next.start : remaining.length;
    data.sections[current.key] = remaining.slice(startIdx, endIdx).trim();
  }

  // 解析教学过程各环节
  if (data.sections.process) {
    const processText = data.sections.process;
    const phases = [];
    const phaseMatches = processText.matchAll(/环节[一二三四五六七八九十][：:]\s*(.+?)(?=\n|$)/g);
    for (const m of phaseMatches) {
      phases.push(m[0].trim());
    }
    if (phases.length === 0) {
      // Fallback: 按段落拆分
      const phaseNames = ['激趣导入', '探究新知', '实践创作', '展评拓展', '总结反馈'];
      const chunks = processText.split(/\n{2,}/);
      chunks.forEach((chunk, i) => {
        if (i < 5 && chunk.trim()) {
          phases.push(`${phaseNames[i]}：${chunk.trim().slice(0, 200)}`);
        }
      });
    }
    data._phases = phases;
  }

  // 解析教学目标各维度
  if (data.sections.objectives) {
    const objText = data.sections.objectives;
    const dims = {};
    const dimPatterns = [
      { key: 'aesthetic', pattern: /审美感知[：:]*\s*(.+?)(?=\n\s*(?:艺术表现|创意实践|文化理解|\n\n|$))/s },
      { key: 'expression', pattern: /艺术表现[：:]*\s*(.+?)(?=\n\s*(?:创意实践|文化理解|\n\n|$))/s },
      { key: 'creative', pattern: /创意实践[：:]*\s*(.+?)(?=\n\s*(?:文化理解|\n\n|$))/s },
      { key: 'cultural', pattern: /文化理解[：:]*\s*(.+?)(?=\n\s*$|$)/s }
    ];
    dimPatterns.forEach(dp => {
      const m = objText.match(dp.pattern);
      if (m) dims[dp.key] = m[1].trim().slice(0, 300);
    });
    data._objectives = dims;
  }

  return data;
}

// ========== 幻灯片构建 ==========
function buildSlideDeck(parsedData, rawText) {
  const d = parsedData;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'EDU_16x9', width: '13.333', height: '7.5' });
  pptx.layout = 'EDU_16x9';

  // 通用页脚
  const footerOpts = { x: 0.5, y: 6.9, w: 12, h: 0.4, fontSize: 8, color: EDU_COLORS.muted, align: 'center' };
  const footerText = '画语小精灵 · 小学美术教学智能助手';

  // ===== Slide 1: 封面 =====
  const slide1 = pptx.addSlide();
  slide1.background = { fill: EDU_COLORS.light };
  // 顶部装饰条
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.08, fill: { color: EDU_COLORS.primary } });
  // 左侧色块装饰
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: 7.5, fill: { color: EDU_COLORS.primary }, opacity: 0.1 });
  // 主标题
  slide1.addText(d.title || '美术课教学设计', {
    x: 1.2, y: 1.8, w: 11, h: 1.5,
    fontSize: 32, fontFace: 'Microsoft YaHei', color: EDU_COLORS.primary, bold: true, align: 'left'
  });
  // 副标题
  const subInfo = [d.grade, d.lessonType].filter(Boolean).join(' · ');
  if (subInfo) {
    slide1.addText(subInfo, {
      x: 1.2, y: 3.4, w: 11, h: 0.6,
      fontSize: 16, fontFace: 'Microsoft YaHei', color: EDU_COLORS.muted, align: 'left'
    });
  }
  // 底部信息
  slide1.addText('基于《义务教育艺术课程标准（2022年版）》', {
    x: 1.2, y: 5.0, w: 11, h: 0.4,
    fontSize: 10, fontFace: 'Microsoft YaHei', color: EDU_COLORS.muted, align: 'left'
  });
  slide1.addText(footerText, footerOpts);

  // ===== Slide 2: 教学目标 =====
  const slide2 = pptx.addSlide();
  slide2.background = { fill: EDU_COLORS.white };
  addSlideHeader(slide2, '🎯 教学目标', '核心素养导向');
  const objs = d._objectives || {};
  const objItems = [
    { label: '审美感知', text: objs.aesthetic || '发现、感受、认识和反应美的特征' },
    { label: '艺术表现', text: objs.expression || '创造艺术形象、表达思想感情' },
    { label: '创意实践', text: objs.creative || '综合运用多学科知识进行创新' },
    { label: '文化理解', text: objs.cultural || '感悟艺术作品人文内涵，坚定文化自信' }
  ];
  objItems.forEach((item, i) => {
    const yPos = 1.6 + i * 1.4;
    // 彩色标签
    slide2.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: yPos, w: 1.8, h: 0.5,
      fill: { color: [EDU_COLORS.primary, EDU_COLORS.secondary, EDU_COLORS.accent, EDU_COLORS.success][i] },
      rectRadius: 0.1
    });
    slide2.addText(item.label, {
      x: 0.8, y: yPos, w: 1.8, h: 0.5,
      fontSize: 13, fontFace: 'Microsoft YaHei', color: EDU_COLORS.white, bold: true, align: 'center', valign: 'middle'
    });
    slide2.addText(item.text, {
      x: 2.9, y: yPos, w: 9.5, h: 0.9,
      fontSize: 11, fontFace: 'Microsoft YaHei', color: EDU_COLORS.dark, valign: 'middle'
    });
  });
  slide2.addText(footerText, footerOpts);

  // ===== Slide 3: 教学重难点 =====
  if (d.sections.keypoints) {
    const slide3 = pptx.addSlide();
    slide3.background = { fill: EDU_COLORS.white };
    addSlideHeader(slide3, '📌 教学重难点', '');
    const kpText = d.sections.keypoints.slice(0, 600);
    slide3.addText(kpText, {
      x: 0.8, y: 1.6, w: 11.5, h: 4.5,
      fontSize: 12, fontFace: 'Microsoft YaHei', color: EDU_COLORS.dark, valign: 'top', lineSpacingMultiple: 1.6
    });
    slide3.addText(footerText, footerOpts);
  }

  // ===== Slides 4-8: 教学过程（5环节） =====
  const phaseColors = [EDU_COLORS.primary, EDU_COLORS.secondary, EDU_COLORS.accent, EDU_COLORS.success, EDU_COLORS.warm];
  const phaseNames = ['激趣导入', '探究新知', '实践创作', '展评拓展', '总结反馈'];
  const phases = d._phases || [];

  phases.forEach((phase, i) => {
    if (i >= 5) return;
    const slide = pptx.addSlide();
    slide.background = { fill: EDU_COLORS.white };
    // 环节编号标签
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 0.3, w: 2.4, h: 0.55,
      fill: { color: phaseColors[i] }, rectRadius: 0.1
    });
    slide.addText(`环节${i + 1}：${phaseNames[i]}`, {
      x: 0.5, y: 0.3, w: 2.4, h: 0.55,
      fontSize: 14, fontFace: 'Microsoft YaHei', color: EDU_COLORS.white, bold: true, align: 'center', valign: 'middle'
    });

    // 环节内容
    const phaseContent = phase.length > 800 ? phase.slice(0, 800) + '...' : phase;
    slide.addText(phaseContent, {
      x: 0.8, y: 1.3, w: 11.5, h: 5.2,
      fontSize: 12, fontFace: 'Microsoft YaHei', color: EDU_COLORS.dark, valign: 'top', lineSpacingMultiple: 1.7
    });
    slide.addText(footerText, footerOpts);
  });

  // ===== 评价设计 Slide =====
  if (d.sections.evaluation) {
    const slideEval = pptx.addSlide();
    slideEval.background = { fill: EDU_COLORS.white };
    addSlideHeader(slideEval, '📊 评价设计', '');
    const evalText = d.sections.evaluation.slice(0, 600);
    slideEval.addText(evalText, {
      x: 0.8, y: 1.6, w: 11.5, h: 4.5,
      fontSize: 12, fontFace: 'Microsoft YaHei', color: EDU_COLORS.dark, valign: 'top', lineSpacingMultiple: 1.6
    });
    slideEval.addText(footerText, footerOpts);
  }

  // ===== 板书设计 Slide =====
  if (d.sections.blackboard) {
    const slideBd = pptx.addSlide();
    slideBd.background = { fill: EDU_COLORS.white };
    addSlideHeader(slideBd, '💡 板书设计', '');
    const bdText = d.sections.blackboard.slice(0, 400);
    slideBd.addShape(pptx.ShapeType.rect, {
      x: 1.5, y: 1.6, w: 10, h: 4.5,
      fill: { color: EDU_COLORS.light }, line: { color: EDU_COLORS.primary, width: 1.5 }
    });
    slideBd.addText(bdText, {
      x: 2, y: 2, w: 9, h: 3.5,
      fontSize: 11, fontFace: 'Microsoft YaHei', color: EDU_COLORS.dark, valign: 'middle', align: 'center', lineSpacingMultiple: 1.6
    });
    slideBd.addText(footerText, footerOpts);
  }

  // ===== 结束页 =====
  const slideEnd = pptx.addSlide();
  slideEnd.background = { fill: EDU_COLORS.light };
  slideEnd.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.08, fill: { color: EDU_COLORS.primary } });
  slideEnd.addText('感谢聆听', {
    x: 1, y: 2.5, w: 11, h: 1.5,
    fontSize: 36, fontFace: 'Microsoft YaHei', color: EDU_COLORS.primary, bold: true, align: 'center'
  });
  slideEnd.addText('用画笔表达世界 · 用美育滋养心灵', {
    x: 1, y: 4.2, w: 11, h: 0.6,
    fontSize: 14, fontFace: 'Microsoft YaHei', color: EDU_COLORS.muted, align: 'center'
  });
  slideEnd.addText(footerText, footerOpts);

  return pptx;
}

function addSlideHeader(slide, title, subtitle) {
  // 顶部装饰线
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.06, fill: { color: EDU_COLORS.primary } });
  slide.addText(title, {
    x: 0.5, y: 0.3, w: 12, h: 0.7,
    fontSize: 22, fontFace: 'Microsoft YaHei', color: EDU_COLORS.primary, bold: true
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.9, w: 12, h: 0.4,
      fontSize: 11, fontFace: 'Microsoft YaHei', color: EDU_COLORS.muted
    });
  }
}

// ========== 公开 API ==========
const EduPPTGenerator = {
  /**
   * 从AI教案文本生成PPTX并触发下载
   * @param {string} lessonPlanText - AI生成的完整教案文本
   * @param {string} filename - 下载文件名（不含扩展名）
   */
  async generate(lessonPlanText, filename) {
    if (typeof PptxGenJS === 'undefined') {
      throw new Error('PPT生成库未加载，请刷新页面后重试');
    }
    const data = parseLessonPlan(lessonPlanText);
    if (!data.title) {
      data.title = '美术课教学设计';
    }
    const pptx = buildSlideDeck(data, lessonPlanText);
    const fname = (filename || data.title || '教案') + '.pptx';
    await pptx.writeFile({ fileName: fname });
    return { success: true, slideCount: pptx.slides.length, filename: fname };
  },

  // 暴露解析器供调试
  parseLessonPlan,
  buildSlideDeck
};

// 暴露到全局
window.EduPPTGenerator = EduPPTGenerator;
