from fabric.api import cd, env, sudo, task, put


env.use_ssh_config = True
env.hosts = ['codebakery.io']
env.project_root = '/home/overlord/bot'
env.remote = 'origin'
env.branch = 'master'
env.app_user = 'overlord'
env['sudo_prefix'] += '-H '


@task
def pull():
    with cd(env.project_root):
        sudo('git pull {} {}'.format(env.remote, env.branch), user=env.app_user)


@task
def npm_update():
    with cd(env.project_root):
        sudo('npm --progress false update', user=env.app_user)


@task
def start():
    sudo('service overlord start')


@task
def stop():
    sudo('service overlord stop')


@task
def restart():
    sudo('service overlord restart')


@task
def reload_nginx():
    sudo('service nginx reload')


@task
def rm_node_modules():
    with cd(env.project_root):
        sudo('rm -rf ./node_modules', user=env.app_user)


@task
def put_config():
    put('./config.json', '/tmp')
    sudo('mv /tmp/config.json {}'.format(env.project_root))
    sudo('chown {} {}/config.json'.format(env.app_user, env.project_root))


@task(default=True)
def deploy():
    pull()
    npm_update()
    restart()
    reload_nginx()
