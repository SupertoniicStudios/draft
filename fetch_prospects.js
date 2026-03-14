const fs = require('fs');

fetch('https://www.fangraphs.com/api/prospects/board/prospects-list?type=0')
  .then(r => r.json())
  .then(d => {
    fs.writeFileSync('fg_keys.json', JSON.stringify(Object.keys(d), null, 2));
    if (Array.isArray(d)) {
        fs.writeFileSync('fg_data.json', JSON.stringify(d.slice(0, 2), null, 2));
    } else {
        for (const key of Object.keys(d)) {
            if (Array.isArray(d[key])) {
                fs.writeFileSync('fg_data.json', JSON.stringify(d[key].slice(0, 2), null, 2));
            }
        }
    }
  })
  .catch(console.error);
