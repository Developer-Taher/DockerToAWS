FROM node:22 as base
WORKDIR /app
COPY package.json ./
COPY . .
EXPOSE 4000


FROM base as development
RUN npm install


FROM base as production
RUN npm install --only=production


# ARG NODE_ENV
# RUN if [ "$NODE_ENV" = "production" ] ; then \
#     npm install --only=production ; \
#     else \
#     npm install; \
#     fi