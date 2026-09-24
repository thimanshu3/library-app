const fs = require('fs');
const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/useState<number\[\]>\(\[\]\)/g, "useState<string[]>([])");
content = content.replace(/useState<number>\(0\)/g, "useState<string>('')");

// a.id - b.copy.id -> a.copy.id.localeCompare(b.copy.id)
content = content.replace(/a\.id - b\.copy\.id/g, "a.copy.id.localeCompare(b.copy.id)");
content = content.replace(/a\.copy\.id - b\.copy\.id/g, "a.copy.id.localeCompare(b.copy.id)");

// detail.authorDescription -> detail.work.authorDescription
content = content.replace(/detail\.authorDescription/g, "detail.work?.authorDescription");
content = content.replace(/detail\.description/g, "detail.work?.description");

// finalBook.copy.id === 0 -> finalBook.copy.id === ''
content = content.replace(/finalBook\.copy\.id === 0/g, "finalBook.copy.id === ''");

// const newId = ...
content = content.replace(/const newId = books\.length > 0 \? Math\.max\(\.\.\.books\.map\(b => b\.copy\.id\)\) \+ 1 : 1/g, "const newId = `c_${Date.now()}`");
content = content.replace(/finalBook\.copy\.id = newId/g, "finalBook.copy.id = newId; finalBook.work.id = `w_${Date.now()}`;");

// { id: 0, title: '' } -> { id: '' } etc
content = content.replace(/id: 0,/g, ""); // remove id: 0

// a.title.localeCompare -> a.work.title.localeCompare
content = content.replace(/a\.title\.localeCompare/g, "a.work.title.localeCompare");

fs.writeFileSync(file, content);
