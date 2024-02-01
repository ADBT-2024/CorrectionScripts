import fs from 'fs'

const packageStudent = JSON.parse(fs.readFileSync('package-student.json', 'utf8'));
const packageMine = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Fusionar dependencias
const combinedDependencies = {
  ...packageStudent.dependencies,
  ...packageMine.dependencies
};

// Fusionar devDependencies
const combinedDevDependencies = {
  ...packageStudent.devDependencies,
  ...packageMine.devDependencies
};


// Crear un nuevo objeto package.json
const combinedPackageJson = {
  ...packageStudent,
  dependencies: combinedDependencies,
  devDependencies: combinedDevDependencies,
  scripts: packageMine.scripts,
  imports: packageMine.imports
};

// Escribir el nuevo package.json
fs.writeFileSync('package.json', JSON.stringify(combinedPackageJson, null, 2));
