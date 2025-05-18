Steps:

1.  echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
    echo 'export CPPFLAGS="-I/opt/homebrew/opt/openjdk@17/include"' >> ~/.zshrc
    source ~/.zshrc

2.  ./set-env.sh

# to start both frontend and backend

3. npm run start-all

# To generate the following parms for .env.local

BITBUCKET_WORKSPACE=debugging-dragons
BITBUCKET_REPO=prompt-template
BITBUCKET_USERNAME=
BITBUCKET_APP_PASSWORD=

# Create an App password

App passwords are access tokens with reduced user access (specified at the time of creation). These passwords can be useful for scripting, CI/CD tools, and testing Bitbucket connected applications while they are in development.

To create an App password:

- Select the Settings cog in the upper-right corner of the top navigation bar.

- Under Personal settings, select Personal Bitbucket settings.

- On the left sidebar, select App passwords.

- Select Create app password.

- Give the App password a name, usually related to the application that will use the password.

- Select the permissions the App password needs. For detailed descriptions of each permission, see: App password permissions.

- Select the Create button. The page will display the New app password dialog.

- Copy the generated password and either record or paste it into the application you want to give access. The password is only displayed once and can't be retrieved later.

https://support.atlassian.com/bitbucket-cloud/docs/create-an-app-password/
