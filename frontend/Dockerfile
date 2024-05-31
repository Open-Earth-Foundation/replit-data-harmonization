# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Install the 'serve' package globally
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 3000

# Start the application using 'serve'
CMD ["serve", "-s", "dist"]
