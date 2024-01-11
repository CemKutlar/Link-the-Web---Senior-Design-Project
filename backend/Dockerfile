# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install application dependencies inside the container
RUN npm install

# Copy the rest of the application to the container
COPY . .

# Define the network port that the container will listen on at runtime.
EXPOSE 3002

# Define the command that will run the app
CMD ["node", "server.js"]
