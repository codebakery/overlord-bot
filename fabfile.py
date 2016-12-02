from fabric.api import cd, env, run, sudo, task


env.use_ssh_config = True
env.hosts = ['codebakery.io']
env.project_root = '/home/overlord/bot'
env.remote = 'origin'
env.branch = 'master'
env.chown_user = 'overlord'
env['sudo_prefix'] += '-H '


@task
def pull():
    with cd(env.project_root):
        sudo('chown -R {} .'.format(env.user))
        run('git pull {} {}'.format(env.remote, env.branch))
        sudo('chown -R {} .'.format(env.chown_user))


@task
def npm_update():
    with cd(env.project_root):
        sudo('npm --progress false update', user=env.chown_user)


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
        sudo('rm -rf ./node_modules', user=env.chown_user)


@task(default=True)
def deploy():
    pull()
    npm_update()
    restart()
    reload_nginx()
