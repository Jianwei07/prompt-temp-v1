Steps:

1.  echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
    echo 'export CPPFLAGS="-I/opt/homebrew/opt/openjdk@17/include"' >> ~/.zshrc
    source ~/.zshrc

2.  ./set-env.sh

# to start both frontend and backend

3. npm run start-all
