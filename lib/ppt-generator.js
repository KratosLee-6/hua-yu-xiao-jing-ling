/**
 * ppt-generator.js v4 — PptxGenJS版教育PPT生成器
 * 已验证PptxGenJS在扩展环境可用
 */
'use strict';

const COLORS = {
  orange: 'E8783B', gold: 'F4A261', blue: '457B9D',
  green: '52B788', yellow: 'E9C46A', dark: '2D2D2D',
  gray: 'A0988C', white: 'FFFFFF', bg: 'FEF9F4'
};

function parseLessonPlan(text) {
  const d = { title: '美术课教学设计', slides: [] };
  let m = text.match(/《(.+?)》/) || text.match(/课题名称[：:]\s*(.+)/);
  if (m) d.title = m[1].replace(/教学设计$/, '').trim();

  const markers = ['教材分析', '学情分析', '教学目标', '教学重难点', '教学准备', '教学过程', '评价设计', '板书设计', '课后反思'];
  const positions = [];
  markers.forEach(name => {
    for (const pat of [new RegExp(`[一二三四五六七八九][、.]\\s*${name}`), new RegExp(`\\d+[、.]\\s*${name}`), new RegExp(`${name}[：:]`)]) {
      const m = text.match(pat);
      if (m) { positions.push({ name, idx: m.index }); break; }
    }
  });
  positions.sort((a, b) => a.idx - b.idx);
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    let content = text.slice(start, end).trim().slice(0, 2000);
    d.slides.push({ title: positions[i].name, content });
  }
  if (d.slides.length === 0) {
    text.split(/\n{3,}/).forEach((chunk, i) => {
      if (chunk.trim() && i < 8) d.slides.push({ title: i === 0 ? '教案内容' : `(${i + 1})`, content: chunk.trim().slice(0, 2000) });
    });
  }
  if (d.slides.length === 0) d.slides.push({ title: '教案内容', content: text.slice(0, 2000) });
  return d;
}

function buildSlideDeck(data) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'EDU', width: 13.333, height: 7.5 });
  pptx.layout = 'EDU';

  const accent = [COLORS.orange, COLORS.gold, COLORS.blue, COLORS.green, COLORS.yellow];
  const footerText = '画语小精灵 · 小学美术教学智能助手';

  // ===== 封面 =====
  const s1 = pptx.addSlide();
  s1.background = { fill: COLORS.bg };
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.08, fill: { color: COLORS.orange } });
  s1.addText(data.title, { x: 1, y: 2, w: 11, h: 1.5, fontSize: 32, fontFace: 'Microsoft YaHei', color: COLORS.orange, bold: true });
  s1.addText('小 学 美 术 课 教 学 设 计', { x: 1, y: 3.6, w: 11, h: 0.5, fontSize: 14, fontFace: 'Microsoft YaHei', color: COLORS.gray });
  s1.addText('基于《义务教育艺术课程标准（2022年版）》', { x: 1, y: 5.2, w: 6, h: 0.4, fontSize: 9, fontFace: 'Microsoft YaHei', color: COLORS.gray });

  // ===== 内容页 =====
  data.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    s.background = { fill: COLORS.white };
    const c = accent[i % accent.length];

    // 顶部色条
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.06, fill: { color: c } });

    // 标题
    s.addText(slide.title, { x: 0.6, y: 0.3, w: 12, h: 0.7, fontSize: 22, fontFace: 'Microsoft YaHei', color: c, bold: true });

    // 正文 - 按行拆分
    const lines = slide.content.split('\n').filter(l => l.trim());
    let yPos = 1.3;
    const lineHeight = 0.35;
    lines.forEach(line => {
      if (yPos > 6.8) return;
      const trimmed = line.trim();
      const isBold = /^(\*\*|【|##|###|\d+[、.）])/.test(trimmed);
      s.addText(trimmed.slice(0, 120), {
        x: 0.8, y: yPos, w: 11.5, h: lineHeight,
        fontSize: isBold ? 14 : 12, fontFace: 'Microsoft YaHei',
        color: isBold ? c : COLORS.dark, bold: isBold
      });
      yPos += lineHeight + 0.05;
    });

    // 页脚
    s.addText(footerText, { x: 0.5, y: 6.9, w: 12, h: 0.4, fontSize: 8, fontFace: 'Microsoft YaHei', color: COLORS.gray, align: 'center' });
  });

  // ===== 结束页 =====
  const se = pptx.addSlide();
  se.background = { fill: COLORS.bg };
  se.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.08, fill: { color: COLORS.orange } });
  se.addText('感谢聆听', { x: 1, y: 2.5, w: 11, h: 1.5, fontSize: 36, fontFace: 'Microsoft YaHei', color: COLORS.orange, bold: true, align: 'center' });
  se.addText('用画笔表达世界 · 用美育滋养心灵', { x: 1, y: 4.2, w: 11, h: 0.6, fontSize: 14, fontFace: 'Microsoft YaHei', color: COLORS.gray, align: 'center' });
  se.addText(footerText, { x: 1, y: 6.5, w: 11, h: 0.4, fontSize: 9, fontFace: 'Microsoft YaHei', color: COLORS.gray, align: 'center' });

  return pptx;
}

const EduPPTGenerator = {
  async generate(lessonPlanText, filename) {
    if (typeof PptxGenJS === 'undefined') throw new Error('PPT库未加载，请刷新页面');
    const data = parseLessonPlan(lessonPlanText);
    const pptx = buildSlideDeck(data);
    const fname = (filename || data.title || '教案') + '.pptx';
    await pptx.writeFile({ fileName: fname });
    return { success: true, slideCount: pptx.slides.length, filename: fname };
  }
};

window.EduPPTGenerator = EduPPTGenerator;
