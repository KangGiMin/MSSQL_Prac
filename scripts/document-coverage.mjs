import fs from 'node:fs/promises';
import { lessons,sourceCoverage } from '../shared/curriculum.mjs';
const rows=lessons.filter(l=>l.pages.length).map(l=>`| ${l.pages[0]}–${l.pages[1]} | ${l.kind==='exercise'?'기출 '+l.number:'개념'} | ${l.title} | ${l.database} | ${l.correction?'원본 정정':''} |`);
const text=`# PDF 전체 학습 대응표\n\n원본 ${sourceCoverage.pageCount}쪽 전체를 보존했습니다. 개념 ${sourceCoverage.concepts}개, 기출 ${sourceCoverage.exercises}개, 별도 확장 실습 ${sourceCoverage.advanced}개입니다.\n\n${sourceCoverage.note}\n\n번호 17–21, 35–37은 원본에 없습니다. 번호 없는 부산지점 응용 문제는 10으로 식별합니다.\n\n| 원본 페이지 | 구분 | 학습 주제 | 실습 DB | 비고 |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n원문은 public/materials/sql-reference.pdf, 전체 텍스트는 public/materials/pages.json에서 확인할 수 있습니다. 각 학습 콘텐츠의 설명·정답·주의사항은 shared/content에 있습니다.\n`;
await fs.mkdir('docs',{recursive:true});await fs.writeFile('docs/source-coverage.md',text);
