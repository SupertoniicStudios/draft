import fs from 'fs';
import Papa from 'papaparse';

const rawCsvPath = './2025 keepers raw.csv';
const playersCsvPath = './clean_yahoo_players.csv';
const outputCsvPath = './keepers_upload.csv';

const rawData = fs.readFileSync(rawCsvPath, 'utf8');
const playersData = fs.readFileSync(playersCsvPath, 'utf8');

const rawParsed = Papa.parse(rawData, { header: false, skipEmptyLines: true });

// Read raw data
const rows = rawParsed.data as string[][];
const teams = rows[0]; // First row is teams

interface TeamKeeper {
    team_name: string;
    player_id: string;
}

const keepers: TeamKeeper[] = [];

// Clean names for matching
function cleanName(name: string) {
    let n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove diacritics
    n = n.replace(/\./g, ""); // remove periods like Jr.
    n = n.replace(/\bpitcher\b/gi, "");
    n = n.replace(/\bbatter\b/gi, "");
    n = n.replace(/\bdh\b/gi, "");
    n = n.replace(/\bsp\b/gi, "");
    n = n.replace(/\brp\b/gi, "");
    n = n.replace(/\bof\b/gi, "");
    n = n.replace(/\bss\b/gi, "");
    n = n.replace(/\b1b\b/gi, "");
    n = n.replace(/\b2b\b/gi, "");
    n = n.replace(/\b3b\b/gi, "");
    n = n.replace(/\bc\b/gi, "");
    n = n.replace(/[\/\(\)]/g, " "); // Replace slashes and parens with space
    return n.trim().replace(/\s+/g, " ");
}

const players = (Papa.parse(playersData, { header: true, skipEmptyLines: true }).data as any[]).map(p => ({
    id: p.id,
    originalName: p.name,
    cleanName: cleanName(p.name)
}));

// Add explicit mapping for tricky ones
const manualMapping: Record<string, string> = {
    'shohei ohtani dh': '1000001',
    'shohie ohtani batter': '1000001',
    'jacob degrom sp': '9701',
    'rafael devers': '10235', // normal but lower case might mismatch slightly
    'brentrooker': '10917',
    'geraldo perodemo': '11417',
    'adley rutschmann': '11732',
    'c sanchez': '11706', // Cristopher Sánchez
    'corbin carrol': '11722',
    'o\'neil cruz': '11370',           // Oneil Cruz
    'pete crow armstrong': '12157',    // Pete Crow-Armstrong
    'spencer schellenbach': '12363',   // Spencer Schwellenbach
    'jordan lawler': '12355',          // Jordan Lawlar
    'kristian campell': '63128',       // Kristian Campbell
    'jacob misirowski': '60254',       // Jacob Misiorowski
};

let missingCount = 0;

for (let r = 1; r < rows.length; r++) {
    for (let c = 0; c < teams.length; c++) {
        const teamName = teams[c];
        const rawPlayerName = rows[r][c]?.trim();

        if (!rawPlayerName) continue;

        let findId: string | null = null;

        const customMatched = manualMapping[rawPlayerName.toLowerCase().trim()];
        if (customMatched) {
            findId = customMatched;
        } else {
            const cleaned = cleanName(rawPlayerName);
            const found = players.find(p => p.cleanName === cleaned);
            if (found) {
                findId = found.id;
            } else {
                // Try fuzzy match
                const fuzzy = players.find(p => p.cleanName.includes(cleaned) || cleaned.includes(p.cleanName));
                if (fuzzy) {
                    findId = fuzzy.id;
                }
            }
        }

        if (findId) {
            let finalTeamName = teamName.trim();
            if (finalTeamName === 'Raw Doggin Randos') {
                finalTeamName = "Raw Doggin' Randos";
            }
            keepers.push({ team_name: finalTeamName, player_id: findId });
        } else {
            console.error(`Missing player match for team '${teamName}': '${rawPlayerName}'`);
            missingCount++;
        }
    }
}

if (missingCount === 0) {
    const csv = Papa.unparse(keepers);
    fs.writeFileSync(outputCsvPath, csv);
    console.log(`Successfully mapped all keepers! Saved to ${outputCsvPath}`);
} else {
    console.log(`Finished with ${missingCount} missing players. CSV not saved or missing rows.`);
}
