FROM node:20-alpine

WORKDIR /app

# Copy package.json first for caching
COPY package*.json ./

# Install only prod deps
RUN npm install

# Copy prisma and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the entire project
COPY . .

# Build TypeScript → creates /app/dist                                                                                                              RUN npm run build
                                                                                                                                                    ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/app.js"]