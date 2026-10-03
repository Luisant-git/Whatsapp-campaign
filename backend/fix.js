const fs = require('fs');
let file = 'src/meta-leads/meta-leads-automation-cron.service.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "{ card_index: 0, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Customer' }] }] }",
  "{ card_index: 0, components: [{ type: 'header', parameters: [{ type: 'image', image: { link: headerImageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' } }] }, { type: 'body', parameters: [{ type: 'text', text: 'Customer' }] }] }"
);

c = c.replace(
  "{ card_index: 1, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Customer' }] }] }",
  "{ card_index: 1, components: [{ type: 'header', parameters: [{ type: 'image', image: { link: headerImageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' } }] }, { type: 'body', parameters: [{ type: 'text', text: 'Customer' }] }] }"
);

fs.writeFileSync(file, c);
console.log('Fixed');
