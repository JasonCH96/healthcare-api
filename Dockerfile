FROM node:20-alpine

WORKDIR /app

# Copiamos solo lo necesario primero (cache-friendly)
COPY package*.json ./

RUN npm install

# Luego el resto del proyecto
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
