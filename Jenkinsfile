pipeline{
  agent { node{ label'workstation' }}
  options {
    // Limit build history with buildDiscarder option:
    // daysToKeepStr: history is only kept up to this many days.
    // numToKeepStr: only this many build logs are kept.
    // artifactDaysToKeepStr: artifacts are only kept up to this many days.
    // artifactNumToKeepStr: only this many builds have their artifacts kept.
    buildDiscarder(logRotator(numToKeepStr: "1"))
    // Enable timestamps in build log console
    timestamps()
    // Maximum time to run the whole pipeline before canceling it
    timeout(time: 1, unit: 'HOURS')
    // Use Jenkins ANSI Color Plugin for log console
    ansiColor('xterm')
    // Limit build concurrency to 1 per branch
    disableConcurrentBuilds()
  }
  stages
  {
    stage('Build release') {
      steps {
        sh'''
          printenv
          echo "publishing release"
          tag="$GIT_BRANCH"
          [ -d "/home/dany/public/antos-release/packages/$tag" ] && rm -rf /home/dany/public/antos-release/packages/$tag || true
          cp -rfv release /home/dany/public/antos-release/packages/$tag
        '''
        script {
            // only useful for any master branch
            //if (env.BRANCH_NAME =~ /^master/) {
            archiveArtifacts artifacts: 'release/', fingerprint: true
            //}
        }
      }
    }
  }
}