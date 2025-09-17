# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install nodemon globally
RUN npm install -g nodemon

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for development)
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
ENV PORT=8080
EXPOSE 8080

# Command to run the application (will be overridden by docker-compose for development)
CMD ["npm", "start"]