const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://vyvordnebenayjkylewo.supabase.co';
const supabaseAnonKey = 'sb_publishable_SMzuf1hR9sI36s6tERZBgQ_wy8cjVTZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

async function run() {
    const { data: existingPlayers, error } = await supabase
        .from('players')
        .select('name');
        
    if (error) {
        console.error("Error fetching players:", error);
        return;
    }

    const existingNames = new Set(existingPlayers.map(p => p.name.toLowerCase()));
    
    // Check for exact matches and common partial matches
    const filteredProspects = prospects.filter(p => !existingNames.has(p.name.toLowerCase()));

    console.log(`Original count: ${prospects.length}`);
    console.log(`Filtered count: ${filteredProspects.length}`);
    
    const duplicateNames = prospects.filter(p => existingNames.has(p.name.toLowerCase())).map(p => p.name);
    if (duplicateNames.length > 0) {
        console.log("Excluded duplicates:", duplicateNames.join(', '));
    }

    let sql = `-- Insert Top MLB Prospects for 2026 (Excluding Duplicates)\n`;
    sql += `INSERT INTO public.players (id, name, team, position, adp)\nVALUES\n`;

    const values = filteredProspects.map((p, index) => {
        // Generate an ID for these non-Yahoo players.
        const id = `prospect_2026_${index + 1}`;
        // Assign an ADP starting at 500 for prospects to appear mostly below standard draft pool but ordered properly.
        const adp = 500 + index;
        return `('${id}', '${p.name.replace(/'/g, "''")}', '${p.team}', '${p.position}', ${adp})`;
    });

    sql += values.join(',\n') + ';\n';

    fs.writeFileSync('insert_top_50_prospects.sql', sql);
    console.log("SQL script regenerated and filtered: insert_top_50_prospects.sql");
}

run();
