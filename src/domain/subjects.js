export const SUBJECTS = [
  { id: 'management', name: '建设工程造价管理', shortName: '管理', color: '#5f8fda' },
  { id: 'pricing', name: '建设工程计价', shortName: '计价', color: '#d28a39' },
  { id: 'civil-measurement', name: '建设工程技术与计量（土木建筑工程）', shortName: '土建计量', color: '#69a86f' },
  { id: 'case-analysis', name: '建设工程造价案例分析（土木建筑工程）', shortName: '案例', color: '#c45f73' },
];

export function getSubject(subjectId) {
  return SUBJECTS.find((subject) => subject.id === subjectId);
}
