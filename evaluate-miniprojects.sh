#!/bin/bash
# Limpiar el entorno
docker stop $(docker ps -aq) || true
docker rm $(docker ps -aq) || true
docker volume prune -f

cd students-projects

# Obtener directorios que contienen package.json
dirs=$(find . -maxdepth 2 -type f -name 'package.json' -exec dirname {} \;)
echo "Found directories:\n$dirs"

# Definir los valores posibles para miniproject
miniprojects=("productReviews" "advancedQueries" "performanceImprovements")
#miniprojects=("performanceImprovements")


# Iterar por cada directorio
for dir in $dirs; do
  cd "$dir"
  echo "Changing to directory $dir"

  # Verificar que el directorio actual es un proyecto node
  if [ -f "package.json" ]; then
    # Iterar por cada miniproject
    for miniproject in "${miniprojects[@]}"; do
      echo "Processing miniproject: $miniproject"

      # Cambiar a la rama correspondiente con git
      git checkout -f $miniproject
      mv package.json package-student.json
      # Copiar ficheros y carpeta

      #Iniciar entorno docker
      cp -f ../../.env.docker .env
      cp -f ../../docker-compose.yml .
      cp ../../init-mongo.sh .
      docker compose up -d

      cp ../../$miniproject/.env.mongo.local .
      cp ../../$miniproject/.env.mongo.atlas .
      cp ../../$miniproject/.env.sequelize .
      cp ../../$miniproject/package.json .
      cp ../../$miniproject/mergePackageJson.js .
      cp ../../$miniproject/jest.config.cjs .
      rm -rf ./tests
      cp -rf ../../$miniproject/tests .
      cp -rf ../../$miniproject/public .

      cp ../../$miniproject/app.js ./src
      cp ../../$miniproject/backend.js ./src
      cp ../../$miniproject/FileService.js ./src/services
      cp ../../$miniproject/mongoose.js ./src/config
      cp ../../$miniproject/sequelize.js ./src/config

      rm -rf ./src/database/seeders
      cp -rf ../../$miniproject/seeders ./src/database

      rm -rf ./tests/results

      node mergePackageJson.js
      # Ejecutar comandos
      npm install
      npm run test
      npx sequelize-cli db:migrate:undo:all
      rm -rf ./node_modules

      #Limpiar el entorno docker
      # cp -f ../../.env.docker .env
      # cp -f ../../docker-compose.yml .
      # docker compose down -v
      # docker network prune -f
      # docker stop $(docker ps -aq)
      # docker rm $(docker ps -aq)
      # docker volume rm $(docker volume ls -q)
      # docker stop $(docker ps -aq) || true
      # docker rm $(docker ps -aq) || true
      # docker volume prune -f
      docker stop $(docker ps -aq) || true
      docker rm $(docker ps -aq) || true
      docker volume prune -f
      docker network ls --filter type=custom -q | xargs -r docker network rm


      rm .env
    done
  fi

  cd ..
  pwd

done
