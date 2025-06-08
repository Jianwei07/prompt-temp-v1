# Steps:

1.  echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
    echo 'export CPPFLAGS="-I/opt/homebrew/opt/openjdk@17/include"' >> ~/.zshrc
    source ~/.zshrc

2.  ./set-env.sh

# to start both frontend and backend

3.  npm run start-all

# To generate the following parms for .env.local

BITBUCKET_WORKSPACE=debugging-dragons
BITBUCKET_REPO=prompt-template
BITBUCKET_USERNAME=
BITBUCKET_APP_PASSWORD=
BITBUCKET_BASE_URL=https://bitbucket.org

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

---

## Updating Maven Dependencies

To keep your project's dependencies up-to-date, follow these steps. This process ensures you're using the latest stable versions while maintaining control over potential breaking changes.

1.  **Check for available updates:**
    Run the following command to see which of your dependencies have newer versions available in your Maven repositories:

    ```bash
    mvn versions:display-dependency-updates
    ```

    This will provide a list of dependencies and their latest available versions.

2.  **Manually update `pom.xml`:**
    Based on the output from the previous step and your project's requirements, open your `pom.xml` file and manually update the `<version>` tags for the dependencies you wish to upgrade.

    **Example `pom.xml` snippet:**

    ```xml
    <dependencies>
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-lang3</artifactId>
            <version>3.14.0</version> </dependency>
        </dependencies>
    ```

3.  **Download updated dependencies and rebuild:**
    After modifying your `pom.xml`, run the following command to download the new dependency versions and rebuild your project:
    ```bash
    mvn clean install
    ```
    Alternatively, for just downloading and compiling:
    ```bash
    mvn compile
    ```

**Important Notes:**

- Always test your application thoroughly after updating dependencies, especially for major version changes, as they might introduce breaking changes.
- Consider using a version control system (like Git) and committing your `pom.xml` changes separately for each dependency update to easily revert if issues arise.
- For general debugging, resync for support engineers : curl -X POST -H "Content-Type: application/json" -d "{\"dryRun\": false}" http://localhost:8080/api/bitbucket/resync
