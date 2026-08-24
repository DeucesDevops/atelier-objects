pipeline {
  agent { label 'docker' }

  options {
    timestamps()
    disableConcurrentBuilds(abortPrevious: true)
    timeout(time: 40, unit: 'MINUTES')
  }

  parameters {
    string(name: 'DEPLOY_HOST', defaultValue: '', description: 'EC2 DNS name or IP address')
    string(name: 'DEPLOY_USER', defaultValue: 'ubuntu', description: 'SSH user')
    string(name: 'VITE_API_URL', defaultValue: '', description: 'Public API URL, for example http://host:8080')
  }

  environment {
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
  }

  stages {
    stage('Test and compile') {
      steps {
        sh 'make install'
        sh 'make validate'
        sh 'make test'
        sh 'npm run build'
        sh 'mvn -B -f services/payment-service/pom.xml -DskipTests package'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: '**/surefire-reports/*.xml, **/junit.xml'
        }
      }
    }
    stage('Build images and run checkout smoke test') {
      steps { sh 'make smoke' }
    }
    stage('Deploy to EC2') {
      when { branch 'main' }
      steps {
        sshagent(credentials: ['commerce-ec2-ssh']) {
          sh '''
            test -n "$DEPLOY_HOST"
            test -n "$VITE_API_URL"
            tar --exclude=.git --exclude=.env --exclude=node_modules --exclude=screenshots -czf /tmp/commerce-platform.tgz .
            ssh -o StrictHostKeyChecking=accept-new "$DEPLOY_USER@$DEPLOY_HOST" 'sudo install -d -o "$USER" -g "$USER" /opt/commerce-platform/current'
            scp /tmp/commerce-platform.tgz "$DEPLOY_USER@$DEPLOY_HOST:/tmp/commerce-platform.tgz"
            ssh "$DEPLOY_USER@$DEPLOY_HOST" 'tar -xzf /tmp/commerce-platform.tgz -C /opt/commerce-platform/current && rm /tmp/commerce-platform.tgz'
            ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd /opt/commerce-platform/current && VITE_API_URL='$VITE_API_URL' ./scripts/deploy-compose.sh"
            curl --fail --retry 12 --retry-delay 10 --retry-all-errors "$VITE_API_URL/health"
          '''
        }
      }
    }
  }

  post {
    always {
      sh 'docker compose down --volumes --remove-orphans || true'
      deleteDir()
    }
  }
}
