import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { BaseReporter } from '@jest/reporters';
import dotenv from 'dotenv';
dotenv.config();

class TestsCSVReporter extends BaseReporter {
  constructor (globalConfig, options) {
    super(globalConfig, options)
    this._globalConfig = globalConfig
    this._options = options
    this._testFiles = {}
    this._testResults = []
  }

  onTestResult (test, testResult, aggregatedResult) {
    const fileName = path.basename(testResult.testFilePath)
    if (!this._testFiles[fileName]) {
      this._testFiles[fileName] = {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
      }
    }

    const file = this._testFiles[fileName]
    file.total += testResult.numFailingTests + testResult.numPassingTests
    file.passed += testResult.numPassingTests
    file.failed += testResult.numFailingTests

    testResult.testResults.forEach(({ fullName, duration, status }) => {
      file.duration += duration
      this._testResults.push({
        file: fileName,
        test: fullName,
        duration,
        status
      })
    })
  }

  onRunComplete (contexts, results) {
    const totalTests = Object.values(this._testFiles).reduce((total, file) => total + file.total, 0)
    const totalPassed = Object.values(this._testFiles).reduce((total, file) => total + file.passed, 0)
    const totalFailed = Object.values(this._testFiles).reduce((total, file) => total + file.failed, 0)
    const totalDuration = Object.values(this._testFiles).reduce((total, file) => total + file.duration, 0)
    const averageDuration = totalTests > 0 ? (totalDuration / totalTests).toFixed(2) : 0

    const summary = `Total Tests: ${totalTests}, Passed Tests: ${totalPassed}, Failed Tests: ${totalFailed}, Average Duration: ${averageDuration}ms`

    const filesSummary = Object.entries(this._testFiles)
      .map(([file, { total, passed, failed, duration }]) => `${file}: Total: ${total}, Passed: ${passed}, Failed: ${failed}, Average Duration: ${total > 0 ? (duration / total).toFixed(2) : 0}ms`)
      .join('\n')

    const testResults = this._testResults
      .map(({ file, test, duration, status }) => `${file},${test},${duration},${status}`)
      .join('\n')

    const databaseTechnology = process.env.DATABASE_PROTOCOL || 'default'

    const outputDir = this._options.outputDir
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir)
    }

    const fileName = `testResults-${databaseTechnology}.csv`
    writeFileSync(`${outputDir}/${fileName}`, `${summary}\n\nFiles Summary:\n${filesSummary}\n\nTest Results:\nFile,Test,Duration,Status\n${testResults}`)

    console.log(`Test results saved to ${fileName}`)


    // Manejo de student-evaluation.json
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const evaluationFilePath = path.join(__dirname, '../../../../student-evaluation.json');
    let evaluationData = {};

    if (existsSync(evaluationFilePath)) {
      evaluationData = JSON.parse(readFileSync(evaluationFilePath, 'utf8'));
    }

    const directoryName = path.basename(path.resolve(__dirname, '../../../'));
    const miniprojectName = 'productReviews';

    if (!evaluationData[directoryName]) {
      evaluationData[directoryName] = {};
      evaluationData[directoryName][miniprojectName] = {};
    }
    if (!evaluationData[directoryName][miniprojectName]) {
      evaluationData[directoryName][miniprojectName] = {};
    }

    const miniProjectScore = totalPassed / totalTests;
    evaluationData[directoryName][miniprojectName][databaseTechnology] = miniProjectScore*100;
    // Cálculo del avgScore excluyendo la propia clave avgScore
    const scores = Object.entries(evaluationData[directoryName][miniprojectName])
    .filter(([key, _]) => key !== 'avgScore')
    .map(([_, value]) => value)
    const avgScore = scores.length > 0 ? scores.reduce((acc, score) => acc + score, 0) / scores.length : 0
    evaluationData[directoryName][miniprojectName]['avgScore'] = avgScore

    // Asignación de pesos a cada miniproject
    const weights = {
      productReviews: 0.3,
      advancedQueries: 0.4,
      performanceImprovements: 0.3
    };

    // Asegurarse de que cada miniproject esté presente y tenga un avgScore
    for (const miniproject in weights) {
      if (!evaluationData[directoryName][miniproject]) {
        evaluationData[directoryName][miniproject] = { avgScore: 0 };
      }
    }

    // Calculo de la nota final como media ponderada
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [miniproject, weight] of Object.entries(weights)) {
      if (evaluationData[directoryName][miniproject] && evaluationData[directoryName][miniproject].avgScore !== undefined) {
        weightedSum += evaluationData[directoryName][miniproject].avgScore * weight;
        totalWeight += weight;
      }
    }
    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    evaluationData[directoryName]['finalScore'] = finalScore;

    writeFileSync(evaluationFilePath, JSON.stringify(evaluationData, null, 2));

    console.log(`Student evaluation data updated in ${evaluationFilePath}`);
  }
}

export default TestsCSVReporter
