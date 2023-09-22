FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application's dependencies inside the container
RUN npm install

# Copy the rest of the application's files to the working directory
COPY . .

# Expose port 3000 for the Express app to listen on
EXPOSE 3000

# Start the Express app
CMD ["node", "server.js"]