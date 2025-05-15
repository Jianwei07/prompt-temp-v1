Parts to remove before going SIT

1. NodeJS items

- filter out expressjs in package.json
- npm install express webpack-dev-middleware webpack-hot-middleware --save-dev (NOT INCLUDED)
- server.js not in use

FOR TESTING

- run both fronend and backend
1. npm start 

Steps: 

1.
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
echo 'export CPPFLAGS="-I/opt/homebrew/opt/openjdk@17/include"' >> ~/.zshrc
source ~/.zshrc

2.
./set-env.sh

3.
mvn spring-boot:run

4.
npm run frontend



