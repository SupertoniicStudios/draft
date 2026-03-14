const fs = require('fs');

const prospects = [
    { name: "Roki Sasaki", team: "LAD", position: "SP" },
    { name: "Roman Anthony", team: "BOS", position: "OF" },
    { name: "Walker Jenkins", team: "MIN", position: "OF" },
    { name: "Carson Williams", team: "TB", position: "SS" },
    { name: "Max Clark", team: "DET", position: "OF" },
    { name: "Jordan Lawlar", team: "ARI", position: "SS" },
    { name: "Ethan Salas", team: "SD", position: "C" },
    { name: "Colt Emerson", team: "SEA", position: "SS" },
    { name: "Samuel Basallo", team: "BAL", position: "C" },
    { name: "Chase DeLauter", team: "CLE", position: "OF" },
    { name: "Noah Schultz", team: "CWS", position: "SP" },
    { name: "Emmanuel Rodriguez", team: "MIN", position: "OF" },
    { name: "Konnor Griffin", team: "PIT", position: "SS/OF" },
    { name: "Charlie Condon", team: "COL", position: "OF/3B" },
    { name: "Travis Bazzana", team: "CLE", position: "2B" },
    { name: "Jackson Jobe", team: "DET", position: "SP" },
    { name: "Sebastian Walcott", team: "TEX", position: "SS" },
    { name: "Marcelo Mayer", team: "BOS", position: "SS" },
    { name: "Colson Montgomery", team: "CWS", position: "SS" },
    { name: "Leodalis De Vries", team: "SD", position: "SS" },
    { name: "JJ Wetherholt", team: "STL", position: "SS/2B" },
    { name: "Jac Caglianone", team: "KC", position: "1B/SP" },
    { name: "Xavier Isaac", team: "TB", position: "1B" },
    { name: "Christian Moore", team: "LAA", position: "2B" },
    { name: "Chase Burns", team: "CIN", position: "SP" },
    { name: "Hagen Smith", team: "CWS", position: "SP" },
    { name: "Lazaro Montes", team: "SEA", position: "OF" },
    { name: "Jett Williams", team: "NYM", position: "SS/OF" },
    { name: "Bryce Eldridge", team: "SF", position: "1B" },
    { name: "Kevin McGonigle", team: "DET", position: "SS/2B" },
    { name: "Andrew Painter", team: "PHI", position: "SP" },
    { name: "Termarr Johnson", team: "PIT", position: "2B" },
    { name: "Matt Shaw", team: "CHC", position: "3B/2B" },
    { name: "Owen Murphy", team: "ATL", position: "SP" },
    { name: "Dalton Rushing", team: "LAD", position: "C/OF" },
    { name: "Cam Collier", team: "CIN", position: "3B" },
    { name: "Tink Hence", team: "STL", position: "SP" },
    { name: "Cole Young", team: "SEA", position: "SS/2B" },
    { name: "Jace LaViolette", team: "TEX_AM", position: "OF" },
    { name: "Ethan Holliday", team: "STILLWATER_HS", position: "SS" },
    { name: "Nick Kurtz", team: "OAK", position: "1B" },
    { name: "Sal Stewart", team: "CIN", position: "3B/2B" },
    { name: "Felnin Celesten", team: "SEA", position: "SS" },
    { name: "Josue De Paula", team: "LAD", position: "OF" },
    { name: "Braden Montgomery", team: "BOS", position: "OF" },
    { name: "Moises Ballesteros", team: "CHC", position: "C/1B" },
    { name: "Orelvis Martinez", team: "TOR", position: "2B/3B" },
    { name: "Jacob Wilson", team: "OAK", position: "SS" },
    { name: "Cade Horton", team: "CHC", position: "SP" },
    { name: "Edgar Quero", team: "CWS", position: "C" }
];

let sql = `-- Insert Top 50 MLB Prospects for 2026\n`;
sql += `INSERT INTO public.players (id, name, team, position, adp)\nVALUES\n`;

const values = prospects.map((p, index) => {
    // Generate an ID for these non-Yahoo players.
    const id = `prospect_${2026}_${index + 1}`;
    // Assign an ADP starting at 500 for prospects to appear mostly below standard draft pool but ordered properly.
    const adp = 500 + index;
    return `('${id}', '${p.name.replace(/'/g, "''")}', '${p.team}', '${p.position}', ${adp})`;
});

sql += values.join(',\n') + ';\n';

// To avoid duplicate key constraints if run multiple times, we can suggest using ON CONFLICT, but we don't know the exact conflict keys.
// Assuming 'id' is the primary key.
// Let's rewrite as ON CONFLICT (id) DO UPDATE... Just in case.

fs.writeFileSync('insert_top_50_prospects.sql', sql);
console.log("SQL script generated: insert_top_50_prospects.sql");
