import fs from 'fs';
import Papa from 'papaparse';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
    console.error('Usage: ts-node clean_csv.ts <inputFile> <outputFile>');
    process.exit(1);
}

const csvData = fs.readFileSync(inputFile, 'utf-8');

// Parse the CSV
Papa.parse(csvData, {
    header: false,
    skipEmptyLines: true,
    complete: (results) => {
        // The actual headers start at row index 4 (0-indexed) based on the snippet.
        // Let's find the row that contains 'id' and 'Full Name'
        const rows = results.data as string[][];
        let headerRowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].includes('id') && rows[i].includes('Full Name')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.error('Could not find header row');
            process.exit(1);
        }

        const headers = rows[headerRowIndex];
        const idIndex = headers.indexOf('id');
        const nameIndex = headers.indexOf('Full Name');
        const teamIndex = headers.indexOf('Team');
        const positionIndex = headers.indexOf('Position');
        const adpIndex = headers.indexOf('ADP');

        const cleanData = [];
        cleanData.push(['id', 'name', 'team', 'position', 'adp']);

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            // Skip bad rows
            if (row.length < headers.length) continue;

            const id = row[idIndex];
            const name = row[nameIndex];
            const team = row[teamIndex];
            const position = row[positionIndex];
            let adp = row[adpIndex];

            if (!id || !name) continue;

            // Some ADPs might be empty or '-'
            if (!adp || adp === '-' || isNaN(Number(adp))) {
                adp = '999.9';
            }

            cleanData.push([id, name, team, position, adp]);
        }

        const outputCsv = Papa.unparse(cleanData);
        fs.writeFileSync(outputFile, outputCsv, 'utf-8');
        console.log(`Successfully cleaned ${cleanData.length - 1} rows. Wrote to ${outputFile}`);
    }
});
