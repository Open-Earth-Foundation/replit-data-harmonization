# Use the official Node.js image from the Docker Hub
FROM node:18

# Set the working directory
WORKDIR /frontend

# Copy the package.json and package-lock.json into the container
COPY package.json package-lock.json ./

# Install the dependencies
RUN npm install

# Ensure node_modules/.bin is in the PATH
ENV PATH /frontend/node_modules/.bin:$PATH

# Debugging: List node_modules/.bin contents to verify vite installation
RUN ls -la /frontend/node_modules/.bin

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port on which the app will run
EXPOSE 4173

# Command to run the application
CMD ["npm", "run", "start"]
