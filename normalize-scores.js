const fs = require('fs');
const path = require('path');

// Reemplaza 'tuArchivo.json' con la ruta real de tu archivo JSON
const fileName = 'student-evaluation-first-iteration.json';
const normalizedFileName = 'normalized-evaluation-test.json';
const normalizedFilePath = path.join(__dirname, normalizedFileName);
const filePath = path.join(__dirname, fileName);

// Leer el archivo JSON
let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
function normalizeScores(data) {
    const miniprojects = ['productReviews', 'advancedQueries', 'performanceImprovements'];
    const technologies = ['mariadb', 'mongodb'];

    miniprojects.forEach(miniproject => {
        technologies.forEach(tech => {
            let minDuration = Infinity;
            let maxDuration = -Infinity;

            // Encuentra el menor y mayor duration/score para la tecnología actual en todos los estudiantes
            Object.values(data).forEach(student => {
                const value = student[miniproject][tech];
                if (miniproject === 'performanceImprovements' && value && typeof value === 'object') {
                    if (value.technologyDuration < minDuration) minDuration = value.technologyDuration;
                    if (value.technologyDuration > maxDuration) maxDuration = value.technologyDuration;
                } else if (value !== undefined && typeof value !== 'object') {
                    if (value < minDuration) minDuration = value;
                    if (value > maxDuration) maxDuration = value;
                }
            });

            // Normaliza los scores para la tecnología actual
            Object.keys(data).forEach(student => {
                const studentData = data[student][miniproject][tech];
                if (miniproject === 'performanceImprovements' && studentData && typeof studentData === 'object') {
                    const score = (1 - ((studentData.technologyDuration - minDuration) / (maxDuration - minDuration))) * 100;
                    // Conservar el valor original como 'score'
                    data[student][miniproject][tech].normalizedScore = score;
                } else if (studentData !== undefined && typeof studentData !== 'object') {
                    const score = (studentData - minDuration) / (maxDuration - minDuration) * 100;
                    // Almacenar el valor original y el score normalizado
                    data[student][miniproject][tech] = { score: studentData, normalizedScore: score };
                }
            });
        });

        // Calcula el normalizedScore promedio para el miniproject
        Object.keys(data).forEach(student => {
            const scores = technologies.map(tech => data[student][miniproject][tech]?.normalizedScore).filter(score => score !== undefined);
            data[student][miniproject].normalizedScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        });
    });
}

function recalculateFinalScores(data) {
    const weights = { productReviews: 0.3, advancedQueries: 0.4, performanceImprovements: 0.3 };
    Object.keys(data).forEach(student => {
        let finalScore = 0;
        Object.entries(weights).forEach(([miniproject, weight]) => {
            finalScore += data[student][miniproject].normalizedScore * weight;
        });
        data[student].finalScore = finalScore;
    });
}

normalizeScores(data);
recalculateFinalScores(data);

// Escribe los cambios en el archivo JSON
fs.writeFileSync(normalizedFilePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Normalization and recalculation completed, original scores preserved.');