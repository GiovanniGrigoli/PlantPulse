
# STAGE 1: compilazione React
FROM node:24-alpine AS build

WORKDIR /app

# Copiamo i file delle dipendenze
COPY package*.json ./

# Installiamo le dipendenze
RUN npm ci

# Copiamo il codice React
COPY . .

# Generiamo la versione di produzione
RUN npm run build


# STAGE 2: distribuzione con Nginx
FROM nginx:alpine

# Copiamo i file compilati nello spazio web di Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configurazione personalizzata di Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
