# Stage 1: Build the React application
FROM --platform=linux/amd64 node:17-alpine AS build

WORKDIR /app

# Set environment path
ENV PATH="/app/node_modules/.bin:$PATH"

# Install app dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the application
RUN npm run build
RUN ls -al /app/build


# Stage 2: Serve the React application from Nginx
FROM nginx:alpine

# Copy the react build from Stage 1
COPY --from=build /app/build /usr/share/nginx/html

# Custom nginc.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 to the host
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
