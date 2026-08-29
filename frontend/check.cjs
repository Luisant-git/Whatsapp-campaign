const fs = require('fs');
const text = fs.readFileSync('src/components/TemplateManager.jsx', 'utf8');
let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
let inString = false, strChar = '';
let inComment = false;
let line = 1;

for(let i=0; i<text.length; i++) {
  let char = text[i];
  if (char === '\n') line++;
  
  if (inString) {
    if (char === strChar && text[i-1] !== '\\') inString = false;
  } else if (inComment) {
    if (char === '*' && text[i+1] === '/') {
      inComment = false;
      i++;
    }
  } else {
    if (char === '\'' || char === '"' || char === '`') {
      inString = true;
      strChar = char;
    } else if (char === '/' && text[i+1] === '*') {
      inComment = true;
      i++;
    } else if (char === '/' && text[i+1] === '/') {
      while(i < text.length && text[i] !== '\n') {
        i++;
      }
      line++;
    } else if (char === '{') {
      c1++;
    } else if (char === '}') {
      c1--;
    } else if (char === '(') {
      c2++;
    } else if (char === ')') {
      c2--;
    } else if (char === '<') {
      c4++;
    } else if (char === '>') {
      c4--;
    }
  }
}
console.log('Braces {}:', c1, 'Parens ():', c2, 'Brackets []:', c3, 'Angles <>:', c4);
