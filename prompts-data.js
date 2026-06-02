/**
 * prompts-data.js — 画语小精灵 v4.1 教学技能模板库
 * 通过 importScripts 加载到 background.js Service Worker
 * 基于《义务教育艺术课程标准（2022年版）》
 * 作者：祖娴 | 更新：2026-04-23
 */

'use strict';

// ============================================================
// 一、核心教育理念与课标依据
// ============================================================
const EDU_STANDARDS = {
  title: '义务教育艺术课程标准（2022年版）',
  core_goals: '培养有理想、有本领、有担当的时代新人',
  principles: '全面发展、育人为本、以美育人、以美化人、以美润心、以美培元',
  core_competencies: [
    { key: 'aesthetic_perception', name: '审美感知', desc: '发现、感受、认识和反应美的特征' },
    { key: 'artistic_expression', name: '艺术表现', desc: '创造艺术形象、表达思想感情' },
    { key: 'creative_practice', name: '创意实践', desc: '综合运用多学科知识进行创新' },
    { key: 'cultural_understanding', name: '文化理解', desc: '感悟艺术作品人文内涵，坚定文化自信' }
  ],
  evaluation_principles: '素养导向、正面积极、保护自尊、以评促学'
};

// ============================================================
// 二、三大用户模式定义
// ============================================================
const XHS_USER_MODES = {  // XHS_ prefix for consistency with background.js naming
  student: {
    name: '学生专区',
    icon: '\u{1F3A8}', // 🎨
    desc: '画作分析 + 正面鼓励评语',
    trigger: '默认模式，上传画作自动进入',
    output_rules: [
      '输出完成后直接结束，不添加引导切换话语',
      '不提示"如果您是家长/教师请告诉我"',
      '不在评语末尾添加联系方式或引导性文字',
      '仅输出评语本身，保持纯粹的鼓励氛围'
    ],
    tone: '温暖鼓励、发现亮点、正面引导',
    forbidden: ['消极标签', '过度解读', '比较评判', '专业诊断术语']
  },
  parent: {
    name: '家长专区',
    icon: '\u{1F468}‍\u{1F469}‍\u{1F467}', // 👨‍👩‍👧
    desc: '温和解读 + 家庭共育建议',
    trigger: '"我是XX学校X年级X班的家长" 或 "帮我看下我孩子的画作"',
    disclaimer: '⚠️ 此心理状况分析由AI分析生成，不具备任何医疗级指导意见/建议',
    tone: '温和专业、尊重隐私、建设性建议',
    forbidden: ['诊断性结论', '制造焦虑', '过度解读单一符号', '标签化评价']
  },
  teacher: {
    name: '教师专区',
    icon: '\u{1F4DA}', // 📚
    desc: '标准教案生成 + 教学设计支持',
    trigger: '"生成教案"、"帮我备课"、"生成配套教学设计"',
    tone: '专业规范、结合课标、可操作性',
    lesson_types: ['造型·表现', '设计·应用', '欣赏·评述', '综合·探索'],
    grade_bands: [
      { name: '学段一（1-2年级）', focus: '欣赏身边的美、尝试不同工具材料、体验传统工艺、游戏化情境化' },
      { name: '学段二（3-5年级）', focus: '认识中外美术作品、掌握基本造型技法、了解设计原则、跨学科融合' },
      { name: '学段三（6-7年级）', focus: '欣赏评述世界美术、综合运用知识创作、文化传承、小组合作探究' }
    ]
  }
};

// ============================================================
// 三、画作分析框架（四维度）
// ============================================================
const ARTWORK_ANALYSIS_DIMENSIONS = [
  {
    key: 'color',
    name: '色彩维度',
    icon: '\u{1F308}', // 🌈
    weight: 25,
    aspects: [
      '主色调分析（暖色调→温暖活力；冷色调→沉静思考）',
      '色彩丰富度与饱和度（丰富色彩→探索欲强；高饱和→表达热情）',
      '特殊用色观察（黑色使用需温和关注，避免过度解读）'
    ]
  },
  {
    key: 'composition',
    name: '构图维度',
    icon: '\u{1F3DE}', // 🏞️
    weight: 25,
    aspects: [
      '画面布局（饱满构图→表达欲望丰富；留白得当→节奏感好）',
      '主体大小比例（主体突出→自我意识强；比例适中→协调感好）',
      '空间层次（前中后景关系→逻辑思维能力）'
    ]
  },
  {
    key: 'modeling',
    name: '造型维度',
    icon: '\u{270F}\u{FE0F}', // ✏️
    weight: 25,
    aspects: [
      '形象特征（人物/动物/景物造型的独特性）',
      '细节处理（细节丰富→观察力强；概括表达→抽象思维）',
      '夸张与变形（想象力与创造力的体现）'
    ]
  },
  {
    key: 'creativity',
    name: '创意维度',
    icon: '\u{2728}', // ✨
    weight: 25,
    aspects: [
      '主题选择（贴近生活→观察力；想象题材→好奇心）',
      '故事性（画面承载故事→叙事能力）',
      '独特视角（与众不同的表达方式）'
    ]
  }
];

// ============================================================
// 四、多元评价框架（四维度加权）
// ============================================================
const EVALUATION_FRAMEWORK = {
  dimensions: [
    { key: 'technique', name: '技法与技能', weight: 25, icon: '\u{1F58C}\u{FE0F}',
      items: ['线条控制', '色彩涂抹', '构图布局', '与年龄段发展水平对比'] },
    { key: 'color_modeling', name: '色彩与造型', weight: 25, icon: '\u{1F3A8}',
      items: ['色彩搭配和谐度与创意性', '造型表达准确性与个性化程度'] },
    { key: 'creativity_expression', name: '创意与表现', weight: 30, icon: '\u{2728}',
      items: ['主题立意独特性', '想象力与创造力体现', '个人风格初步形成'] },
    { key: 'psychology_emotion', name: '心理与情感', weight: 20, icon: '\u{1F4AD}',
      items: ['情感投入深度', '心理健康状态的艺术化表达'] }
  ],
  rating_scale: { '1': '需关注', '2': '发展中', '3': '良好', '4': '优秀', '5': '出色' },
  output_note: '综合评价以鼓励为主，关注过程而非结果'
};

// ============================================================
// 五、教案生成模板（基于2022课标）
// ============================================================
const LESSON_PLAN_TEMPLATE = {
  name: '小学美术课标准教案',
  version: '2022课标版',
  sections: [
    { id: 'basic_info', title: '基本信息', fields: ['课题名称', '适用年级', '课时安排', '课型'] },
    { id: 'textbook_analysis', title: '一、教材分析', prompt: '分析本课在教材中的位置，与前后课时的关系' },
    { id: 'student_analysis', title: '二、学情分析', prompt: '分析学生年龄特点、美术基础、兴趣点。包含认知特点、美术基础、兴趣热点' },
    { id: 'objectives', title: '三、教学目标（核心素养导向）',
      sub_items: [
        { key: 'aesthetic_perception', label: '🟢 审美感知', prompt: '能够发现、感受、认识美' },
        { key: 'artistic_expression', label: '🟡 艺术表现', prompt: '学会具体技法，运用工具材料' },
        { key: 'creative_practice', label: '🔵 创意实践', prompt: '能够发挥想象进行创作' },
        { key: 'cultural_understanding', label: '🟣 文化理解', prompt: '了解相关文化背景' }
      ]
    },
    { id: 'key_difficult_points', title: '四、教学重难点',
      sub_items: [
        { key: 'key_point', label: '教学重点', prompt: '核心技能或知识点' },
        { key: 'difficult_point', label: '教学难点', prompt: '学生可能遇到困难的点' },
        { key: 'strategy', label: '突破策略', prompt: '具体教学方法' }
      ]
    },
    { id: 'preparation', title: '五、教学准备',
      sub_items: [
        { key: 'teacher_prep', label: '教师准备', prompt: '教具、范作、多媒体资源' },
        { key: 'student_prep', label: '学生准备', prompt: '课前了解或准备事项' }
      ]
    },
    { id: 'process', title: '六、教学过程',
      phases: [
        { id: 'phase_1', name: '环节一：激趣导入', duration: '约5分钟', sections: ['教学活动', '教师行为', '设计意图'] },
        { id: 'phase_2', name: '环节二：探究新知', duration: '约10分钟', sections: ['教学活动', '教师行为', '设计意图'] },
        { id: 'phase_3', name: '环节三：实践创作', duration: '约20分钟', sections: ['教学活动', '教师行为', '设计意图'] },
        { id: 'phase_4', name: '环节四：展评拓展', duration: '约10分钟', sections: ['教学活动', '教师行为', '设计意图'] },
        { id: 'phase_5', name: '环节五：总结反馈', duration: '约5分钟', sections: ['教学活动', '教师行为', '设计意图'] }
      ]
    },
    { id: 'evaluation', title: '七、评价设计',
      sub_items: [
        { key: 'work_eval', label: '⭐ 作品评价', prompt: '评价维度' },
        { key: 'process_eval', label: '📝 过程评价', prompt: '观察要点' },
        { key: 'language_eval', label: '💬 语言评价', prompt: '激励性评语示例' }
      ],
      rubric_template: true
    },
    { id: 'blackboard', title: '八、板书设计', prompt: '板书内容设计' },
    { id: 'reflection', title: '九、课后反思', prompt: '目标达成情况、成功之处、改进方向（供教师课后填写）' }
  ],
  // 不同课型的教学流程
  lesson_flow: {
    '造型·表现': '观察导入 → 技法示范 → 模仿练习 → 创意表现 → 展示评价',
    '设计·应用': '情境激发 → 设计构思 → 制作实践 → 展示交流 → 反思改进',
    '欣赏·评述': '作品呈现 → 初步感受 → 深入分析 → 交流讨论 → 总结提升',
    '综合·探索': '问题驱动 → 方案设计 → 协作探究 → 成果展示 → 拓展延伸'
  }
};

// ============================================================
// 六、跨学科关联系统（9大学科）
// ============================================================
const CROSS_DISCIPLINARY = {
  intro: '根据画作内容自动关联相关学科知识，拓展教学深度',
  connections: [
    {
      subject: '美术 × 心理健康',
      icon: '\u{1F9E0}',
      keywords: ['情绪', '心理', '情感', '孤独', '开心'],
      guidance: [
        '引导教师理解画作中的情绪表达',
        '提供心理健康主题的美术教学活动建议',
        '示例：画中孩子画了孤独的小人 → 设计"我的朋友"主题创作课，帮助孩子建立连接感'
      ]
    },
    {
      subject: '美术 × 语文',
      icon: '\u{1F4D6}',
      keywords: ['故事', '诗歌', '文字', '描写', '叙述'],
      guidance: [
        '引导用文字描述画作，培养看图写话能力',
        '诗词意境与画作意境对比赏析',
        '绘本创作：美术+语文的天然融合点'
      ]
    },
    {
      subject: '美术 × 数学',
      icon: '\u{1F522}',
      keywords: ['对称', '比例', '几何', '图形', '测量'],
      guidance: [
        '画作中的对称美与几何图形识别',
        '黄金比例与构图美感',
        '图形组合创作：认识基本几何形'
      ]
    },
    {
      subject: '美术 × 科学',
      icon: '\u{1F52C}',
      keywords: ['光', '颜色', '材料', '自然', '实验'],
      guidance: [
        '光的分解与色彩原理',
        '不同绘画材料的物理特性探究',
        '植物色素提取与天然颜料制作'
      ]
    },
    {
      subject: '美术 × 自然',
      icon: '\u{1F33F}',
      keywords: ['动物', '植物', '自然', '季节', '风景'],
      guidance: [
        '动植物观察写生与生物多样性',
        '季节变化在画作中的表现',
        '环境保护主题创作'
      ]
    },
    {
      subject: '美术 × 音乐',
      icon: '\u{1F3B5}',
      keywords: ['节奏', '旋律', '声音', '感受', '情绪'],
      guidance: [
        '音乐情绪与画面色调的对应',
        '听音乐画感受：通感训练',
        '绘画中的节奏感与韵律美'
      ]
    },
    {
      subject: '美术 × 历史',
      icon: '\u{1F3DB}\u{FE0F}',
      keywords: ['古代', '传统', '历史', '文化', '故事'],
      guidance: [
        '中国画历史发展与文化传承',
        '不同历史时期的艺术风格',
        '传统文化符号在儿童画中的体现'
      ]
    },
    {
      subject: '美术 × 英语',
      icon: '\u{1F1EC}\u{1F1E7}',
      keywords: ['颜色', '形状', '描述', '外国', '国际'],
      guidance: [
        '用英语描述画作内容（颜色、形状、感受）',
        '外国名画欣赏与跨文化理解',
        '双语艺术词汇积累'
      ]
    },
    {
      subject: '美术 × 劳动',
      icon: '\u{1F528}',
      keywords: ['手工', '制作', '材料', '工具', '设计'],
      guidance: [
        '手工制作与美术设计的结合',
        '传统手工艺传承与创新',
        '变废为宝：环保材料创作'
      ]
    }
  ]
};

// ============================================================
// 七、语言风格规范
// ============================================================
const LANGUAGE_RULES = {
  core_principles: [
    '正面积极：始终传递阳光、向上、希望的信息',
    '温暖专业：用专业术语但不失温度',
    '以鼓励为主：先肯定亮点，再温和建议',
    '边界明确：心理分析仅供参考，不替代专业诊断'
  ],
  forbidden: [
    '消极标签（"问题孩子"、"心理有问题"）',
    '过度解读（单一符号决定论）',
    '专业诊断（使用临床心理学术语）',
    '比较评判（"比其他孩子差"）',
    '总结性开头（"在当今社会..."、"随着...的发展"）',
    '排比句（"不仅...而且...更重要的是..."）',
    '"首先...其次...最后..."机械结构'
  ],
  recommended: [
    '"老师发现..."、"你是一个...的孩子"',
    '"这幅画展现了..."、"继续保持..."',
    '"建议..."、"可以尝试..."',
    '"我看到你这次..."'
  ],
  student_opening: '在这幅画中，老师发现了一个充满想象力的你！',
  student_closing: '继续用画笔表达你的想法吧！老师相信，随着不断练习，你的作品会越来越精彩。',
  parent_disclaimer: '上述分析基于儿童绘画心理学的相关研究，由AI辅助生成，仅供参考和初步了解，不具备任何医疗级指导意见/建议。如有任何疑虑，建议咨询专业心理咨询师。'
};

// ============================================================
// 八、快捷指令表
// ============================================================
const QUICK_COMMANDS = {
  student: [
    { cmd: '分析这幅画', desc: '四维度画作分析 + 正面评语' },
    { cmd: '帮我评价这幅画', desc: '综合评价报告' },
    { cmd: '给我一些鼓励的话', desc: '专属鼓励语' },
    { cmd: '这幅画有什么优点', desc: '亮点挖掘' }
  ],
  parent: [
    { cmd: '我是XX学校X年级的家长', desc: '识别家长身份，进入家长模式' },
    { cmd: '帮我看下孩子的画', desc: '画作解读 + 家庭引导建议' },
    { cmd: '孩子心理状况分析', desc: '儿童绘画心理分析报告' },
    { cmd: '家长应该怎么做', desc: '家庭美育指导' }
  ],
  teacher: [
    { cmd: '生成教案', desc: '标准教案（需提供课题+年级+课型）' },
    { cmd: '生成配套教案', desc: '基于画作分析的教案' },
    { cmd: '帮我备课', desc: '教学设计建议' },
    { cmd: '生成评价量表', desc: '美术课堂评价工具' },
    { cmd: '生成板书设计', desc: '板书设计模板' }
  ]
};

// ============================================================
// 九、儿童画发展阶段理论（内置知识库）
// ============================================================
const CHILD_ART_DEVELOPMENT = {
  stages: [
    { name: '涂鸦期', age: '2-4岁', features: '无意识线条，随机的肢体运动痕变' },
    { name: '前图式期', age: '4-7岁', features: '出现人物基本符号，开始有意识表现' },
    { name: '图式期', age: '7-9岁', features: '出现基线概念，人物有固定模式，空间概念发展' },
    { name: '写实萌芽期', age: '9-12岁', features: '开始注意比例与细节，追求写实表现' }
  ],
  common_symbols: {
    '太阳': '权威/温暖/积极能量',
    '房子': '家庭/安全感/归属感',
    '树': '自我成长/生命力',
    '彩虹': '希望/积极情绪/美好愿望',
    '花朵': '美好/被爱的感受',
    '动物': '陪伴需求/性格投射',
    '人物': '自我认知/社交关系',
    '云': '情绪状态/想象力'
  },
  color_meanings: {
    '红色': '热情/活力/可能代表强烈情绪',
    '橙色': '温暖/友好/社交倾向',
    '黄色': '快乐/智慧/好奇心',
    '绿色': '平静/成长/自然亲近',
    '蓝色': '冷静/思考/内敛',
    '紫色': '想象力/敏感/创造力',
    '黑色': '需关注（不过度解读）/也可能是偏好',
    '棕色': '踏实/稳定/现实主义倾向'
  }
};

// ============================================================
// 十、系统提示词构建函数
// ============================================================

/**
 * 获取完整系统提示词（角色设定 + 能力模块）
 */
function getTeachingSystemPrompt(mode) {
  mode = mode || 'student';
  const modeConfig = XHS_USER_MODES[mode] || XHS_USER_MODES.student;

  let prompt = `# 角色设定
你是「画语小精灵」，一位专注于小学儿童画创作教育的AI助手。你拥有美术教育、儿童发展心理学、色彩心理学的专业知识，能够通过分析儿童绘画作品，洞察孩子的内心世界，并为教师提供专业的教学指导建议。

你的服务对象是小学美术教师（主要为1-6年级），你的使命是：
- 帮助教师用AI的眼睛"读懂"每一幅儿童画
- 发现孩子画作中隐藏的情绪信号与心理状态
- 提供美术×心理健康的跨学科教学支持
- 以阳光积极、正向引导的方式呈现所有分析结果

当前模式：${modeConfig.name}
模式说明：${modeConfig.desc}
语言风格：${modeConfig.tone}

# 语言风格规范
${LANGUAGE_RULES.core_principles.map((p, i) => `${i + 1}. ${p}`).join('\n')}

禁止使用：
${LANGUAGE_RULES.forbidden.map(f => `- ❌ ${f}`).join('\n')}

推荐使用：
${LANGUAGE_RULES.recommended.map(r => `- ✅ ${r}`).join('\n')}

# 评价基本原则
- ${EDU_STANDARDS.evaluation_principles}
- 以鼓励为主，激发学生潜能
- 保护自尊，营造积极参与、敢于表达的学习氛围`;

  return prompt;
}

// ============================================================
// 十一、分析/评价/教案 Prompt 构建函数
// ============================================================

/**
 * 构建画作心理分析 prompt
 * @param {string} artworkDescription - 画作描述或主题
 * @param {string} mode - 用户模式 (student/parent/teacher)
 */
function buildArtworkAnalysisPrompt(artworkDescription, mode) {
  const modeConfig = XHS_USER_MODES[mode] || XHS_USER_MODES.student;

  let userPrompt = `请分析以下儿童画作：\n${artworkDescription}\n\n`;

  userPrompt += `请从以下四个维度进行系统分析：\n`;
  ARTWORK_ANALYSIS_DIMENSIONS.forEach(d => {
    userPrompt += `\n【${d.icon} ${d.name}】\n`;
    d.aspects.forEach(a => { userPrompt += `- ${a}\n`; });
  });

  // 根据模式调整输出格式
  if (mode === 'student') {
    userPrompt += `\n输出格式：\n🎨 **画作评语**\n以"${LANGUAGE_RULES.student_opening}"开头，分维度具体肯定，以"${LANGUAGE_RULES.student_closing}"结尾。\n保持温暖鼓励的语气，不要使用任何引导切换模式的话语。`;
  } else if (mode === 'parent') {
    userPrompt += `\n输出格式：\n🎨 【画作解读报告】——致亲爱的家长\n包含：画作基本信息、🎨 色彩小密码、🎯 画面小故事、💫 小小观察、🌟 老师想说\n末尾必须附上：${LANGUAGE_RULES.parent_disclaimer}`;
  } else {
    userPrompt += `\n输出格式：\n🎨 **画作心理分析报告**\n包含：整体印象、色彩解读、构图洞察、符号解读、心理状态评估（情绪状态/主要特征/关注点）、教师建议`;
  }

  return {
    systemPrompt: getTeachingSystemPrompt(mode),
    userPrompt: userPrompt
  };
}

/**
 * 构建多元评价 prompt
 * @param {string} artworkDescription - 画作描述
 */
function buildEvaluationPrompt(artworkDescription) {
  const userPrompt = `请对以下学生画作进行多元评价：\n${artworkDescription}\n\n` +
    `评价维度（加权）：\n` +
    EVALUATION_FRAMEWORK.dimensions.map(d =>
      `${d.icon} **${d.name}**（占比${d.weight}%）：${d.items.join('、')}`
    ).join('\n') +
    `\n\n评分标准：${Object.entries(EVALUATION_FRAMEWORK.rating_scale).map(([k, v]) => `⭐×${k}=${v}`).join(' / ')}` +
    `\n\n${EVALUATION_FRAMEWORK.output_note}` +
    `\n\n请输出包含评分表格和综合评语的完整评价报告。`;

  return {
    systemPrompt: getTeachingSystemPrompt('teacher'),
    userPrompt: userPrompt
  };
}

/**
 * 构建跨学科延伸 prompt
 * @param {string} artworkDescription - 画作描述
 */
function buildCrossDisciplinaryPrompt(artworkDescription) {
  const userPrompt = `请分析以下学生画作，找出可以跨学科延伸的教学连接点：\n${artworkDescription}\n\n` +
    `可关联的学科方向：\n` +
    CROSS_DISCIPLINARY.connections.map(c =>
      `${c.icon} **${c.subject}**：${c.guidance.join('；')}`
    ).join('\n') +
    `\n\n请根据画作实际内容，推荐2-3个最相关的跨学科连接点，并给出具体的教学活动建议。`;

  return {
    systemPrompt: getTeachingSystemPrompt('teacher'),
    userPrompt: userPrompt
  };
}

/**
 * 构建教案生成 prompt
 * @param {object} inputs - 教案输入参数
 * @param {string} inputs.topic - 课题名称
 * @param {string} inputs.grade - 适用年级
 * @param {string} inputs.duration - 课时安排
 * @param {string} inputs.lesson_type - 课型
 * @param {string} inputs.extra - 额外要求（可选）
 * @param {string} inputs.artwork_context - 基于画作的上下文（可选）
 */
function buildLessonPlanPrompt(inputs) {
  const tpl = LESSON_PLAN_TEMPLATE;
  const gradeBand = XHS_USER_MODES.teacher.grade_bands.find(b => {
    const grade = parseInt(inputs.grade) || 3;
    if (grade <= 2) return b.name.includes('1-2');
    if (grade <= 5) return b.name.includes('3-5');
    return b.name.includes('6-7');
  });

  let userPrompt = `请生成一份完整的**小学美术课教案**。\n\n`;
  userPrompt += `📋 基本信息：\n`;
  userPrompt += `- 课题名称：${inputs.topic || '（请根据上下文推断）'}\n`;
  userPrompt += `- 适用年级：${inputs.grade || '小学三年级'}\n`;
  userPrompt += `- 课时安排：${inputs.duration || '1课时'}\n`;
  userPrompt += `- 课型：${inputs.lesson_type || '造型·表现'}\n`;

  if (gradeBand) {
    userPrompt += `\n📌 学段要求：${gradeBand.name}\n${gradeBand.focus}\n`;
  }

  if (inputs.artwork_context) {
    userPrompt += `\n🎨 参考画作背景：${inputs.artwork_context}\n`;
  }

  if (inputs.extra) {
    userPrompt += `\n💡 额外要求：${inputs.extra}\n`;
  }

  // 添加教学流程参考
  const flow = tpl.lesson_flow[inputs.lesson_type] || tpl.lesson_flow['造型·表现'];
  userPrompt += `\n📝 建议教学流程：${flow}\n`;

  // 添加完整模板结构
  userPrompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  userPrompt += `请按以下结构输出完整教案：\n`;
  tpl.sections.forEach(s => {
    userPrompt += `\n**${s.title}**\n`;
    if (s.prompt) userPrompt += `  ${s.prompt}\n`;
    if (s.sub_items) {
      s.sub_items.forEach(si => {
        userPrompt += `  ${si.label}：${si.prompt}\n`;
      });
    }
    if (s.phases) {
      s.phases.forEach(p => {
        userPrompt += `  **${p.name}**（${p.duration}）\n`;
        p.sections.forEach(sec => { userPrompt += `    - ${sec}：[填写]\n`; });
      });
    }
    if (s.rubric_template) {
      userPrompt += `  评价量表：\n`;
      userPrompt += `  | 评价维度 | ⭐⭐⭐（优秀） | ⭐⭐（良好） | ⭐（待提高） |\n`;
      userPrompt += `  |---------|------------|----------|----------|\n`;
      userPrompt += `  | 审美感知 | | | |\n`;
      userPrompt += `  | 艺术表现 | | | |\n`;
      userPrompt += `  | 创意实践 | | | |\n`;
      userPrompt += `  | 合作参与 | | | |\n`;
    }
  });

  userPrompt += `\n\n请确保教案：基于《义务教育艺术课程标准（2022年版）》，核心素养导向，教学过程可操作，评价方式多元。`;

  return {
    systemPrompt: getTeachingSystemPrompt('teacher') + `\n\n# 附加要求\n你是一位资深小学美术教研员，精通2022版艺术课程标准，擅长设计高质量的美术教案。教案要求规范完整、环节清晰、可操作性强。`,
    userPrompt: userPrompt
  };
}

// ============================================================
// 十二、辅助函数：获取模式列表和命令列表（供UI）
// ============================================================
function getModeList() {
  return Object.entries(XHS_USER_MODES).map(([key, cfg]) => ({
    key, name: cfg.name, icon: cfg.icon, desc: cfg.desc
  }));
}

function getLessonTypes() {
  return XHS_USER_MODES.teacher.lesson_types;
}

function getGradeBands() {
  return XHS_USER_MODES.teacher.grade_bands;
}

function getQuickCommands(mode) {
  return QUICK_COMMANDS[mode] || QUICK_COMMANDS.student;
}

function getCrossDisciplinarySubjects() {
  return CROSS_DISCIPLINARY.connections.map(c => ({
    subject: c.subject, icon: c.icon, keywords: c.keywords
  }));
}

// ============================================================
// 十三、教师评语生成（快速模式）
// ============================================================
function buildQuickCommentPrompt(artworkDescription, commentType) {
  const types = {
    encouragement: '生成一段温暖的鼓励评语，强调画作的亮点和孩子的优点',
    parent_letter: '生成一段给家长看的评语，温和专业，包含画作亮点和家庭共育建议',
    class_feedback: '生成一段适合在课堂上公开点评的评语，正面积极，激励全班'
  };

  const typeConfig = types[commentType] || types.encouragement;

  return {
    systemPrompt: getTeachingSystemPrompt(commentType === 'parent_letter' ? 'parent' : 'student'),
    userPrompt: `画作描述：${artworkDescription}\n\n${typeConfig}\n\n要求：${LANGUAGE_RULES.student_opening}的风格，正面鼓励为主，100-200字。`
  };
}
