export const RESOURCE_CATALOG = [
  {
    id: 'official-2025-syllabus',
    category: 'official',
    title: '住建部 2025 版全国一级造价工程师职业资格考试大纲通知',
    url: 'https://www.mohurd.gov.cn/gongkai/zc/wjk/art/2025/art_9a6fb37d580340a985f863723c4d486f.html',
    subjectId: 'all',
    accessLevel: 'free',
    note: '官方大纲自 2025 年 5 月 1 日起施行，是任务目录和复习边界的最高优先级依据。',
  },
  {
    id: 'official-cpta',
    category: 'official',
    title: '中国人事考试网',
    url: 'https://www.cpta.com.cn/',
    subjectId: 'all',
    accessLevel: 'free',
    note: '报名、准考证、成绩和证书等全国统一入口。',
  },
  {
    id: 'official-zhejiang-exam',
    category: 'official',
    title: '浙江人事考试网',
    url: 'https://www.zjks.com/',
    subjectId: 'all',
    accessLevel: 'free',
    note: '浙江省本地考务通知入口，后续关注嘉兴考区相关安排。',
  },
  {
    id: 'materials-233-book',
    category: 'materials',
    title: '233 网校 2026 一级造价工程师教材目录与变动',
    url: 'https://www.233.com/zaojia/book/',
    subjectId: 'all',
    accessLevel: 'partial-free',
    note: '用于核对教材目录、教材变动和免费视频解读入口。',
  },
  {
    id: 'materials-hqwx-downloads',
    category: 'materials',
    title: '环球网校一级造价工程师真题资料下载',
    url: 'https://www.hqwx.com/ziliao/class_zaojia/0/17837/',
    subjectId: 'all',
    accessLevel: 'partial-free',
    note: '公开资料下载页，可能需要登录或表单流程。',
  },
  {
    id: 'question-233-papers',
    category: 'questionBanks',
    title: '233 网校一级造价工程师历年真题在线练习',
    url: 'https://ks.233.com/24/2',
    subjectId: 'all',
    accessLevel: 'partial-free',
    note: '历年真题和在线测试入口，适合章节学完后的检索练习。',
  },
  {
    id: 'question-233-pricing',
    category: 'questionBanks',
    title: '233 网校工程计价章节练习入口',
    url: 'https://www.233.com/zaojia/jjkz/',
    subjectId: 'pricing',
    accessLevel: 'partial-free',
    note: '计价科目考点练习、章节练习、每日一练等入口。',
  },
  {
    id: 'question-wantiku',
    category: 'questionBanks',
    title: '万题库一级造价师题库',
    url: 'https://www.wantiku.com/zaojia/',
    subjectId: 'all',
    accessLevel: 'partial-free',
    note: '题库型练习入口，具体免费范围以页面实际展示为准。',
  },
  {
    id: 'course-233-free',
    category: 'courses',
    title: '233 网校一级造价工程师免费视频与资料入口',
    url: 'https://www.233.com/zaojia/book/',
    subjectId: 'all',
    accessLevel: 'partial-free',
    note: '教材页包含公开视频解读和资料礼包入口，可作为网课直达。',
  },
];

export function groupResourceCatalog(resources = RESOURCE_CATALOG) {
  return {
    official: resources.filter((resource) => resource.category === 'official'),
    materials: resources.filter((resource) => resource.category === 'materials'),
    questionBanks: resources.filter((resource) => resource.category === 'questionBanks'),
    courses: resources.filter((resource) => resource.category === 'courses'),
  };
}

export function hasQuestionBankResources(resources = RESOURCE_CATALOG) {
  return resources.some((resource) => resource.category === 'questionBanks');
}
