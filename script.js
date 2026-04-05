document.addEventListener('DOMContentLoaded', () => {
    // Adicionado o ícone do Docker para simular a Virtualização
    const svgs = {
        laptop: '<svg viewBox="0 0 24 24"><path d="M20 16V6H4v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-8 1.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zM22 20H2v-2h20v2z"/></svg>',
        mobile: '<svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>',
        api: '<svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
        lb: '<svg viewBox="0 0 24 24"><path d="M12 3L4 9v12h16V9l-8-6zm0 2.5l5 3.75v8.75h-10v-8.75l5-3.75zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
        server: '<svg viewBox="0 0 24 24"><path d="M4 5h16v4H4V5zm0 10h16v4H4v-4zm2-2h12V7H6v6zm0 10h12v-6H6v6z"/></svg>',
        docker: '<img src="logo-docker-svgrepo-com.svg" style="width: 24px; height: 24px; object-fit: contain;">',
        db: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 4.24 2 7v10c0 2.76 4.48 5 10 5s10-2.24 10-5V7c0-2.76-4.48-5-10-5zm0 3c4.54 0 8 1.52 8 2s-3.46 2-8 2-8-1.52-8-2 3.46-2 8-2zm0 15c-4.54 0-8-1.52-8-2v-2.32c2.19.89 4.93 1.32 8 1.32s5.81-.43 8-1.32V17c0 .48-3.46 2-8 2zm0-5c-4.54 0-8-1.52-8-2v-2.32c2.19.89 4.93 1.32 8 1.32s5.81-.43 8-1.32V12c0 .48-3.46 2-8 2z"/></svg>'
    };

    document.querySelectorAll('.client .icon').forEach(el => el.innerHTML = svgs.laptop);
    document.querySelector('.lb .icon').innerHTML = svgs.lb;
    document.querySelectorAll('.server .icon').forEach(el => el.innerHTML = svgs.server);
    document.querySelectorAll('.db .icon').forEach(el => el.innerHTML = svgs.db);

    const canvas = document.getElementById('canvas');
    const svgLines = document.getElementById('network-lines');
    
    let pos = {
        c1: {x: 80, y: 150}, c2: {x: 80, y: 350}, c3: {x: 80, y: 550},
        lb: {x: 250, y: 350},
        s1: {x: 450, y: 350}, s2: {x: 450, y: 150}, s3: {x: 450, y: 550},
        db_master: {x: 650, y: 350}, db_replica: {x: 650, y: 550}
    };

    for (const [id, coords] of Object.entries(pos)) {
        const el = document.getElementById(id);
        if(el) { el.style.left = coords.x + 'px'; el.style.top = coords.y + 'px'; }
    }

    let isTLS = false;
    let isScale = false;
    let isShared = false;
    let isReplicating = false;
    let isCrashed = false;
    let isVirtual = false;
    let availableServers = ['s1']; 

    // Centraliza a lógica de quais servidores estão online
    function updateAvailableServers() {
        let servers = [];
        const btnMig = document.getElementById('btn-mig');
        const btnEsc = document.getElementById('btn-esc');

        if (btnMig && btnMig.checked) {
            servers = ['s2'];
        } else if (btnEsc && btnEsc.checked) {
            servers = ['s1', 's2', 's3'];
        } else {
            servers = ['s1'];
        }

        // Aplica a regra de Tolerância a Falhas (Se o S1 cair, remove ele da lista)
        if (isCrashed) {
            servers = servers.filter(s => s !== 's1');
            const s1 = document.getElementById('s1');
            if (s1 && !s1.classList.contains('hidden')) {
                s1.classList.add('server-locked');
                s1.querySelector('.icon').style.borderColor = '#f38ba8';
            }
        } else {
            const s1 = document.getElementById('s1');
            if (s1) {
                s1.classList.remove('server-locked');
                s1.querySelector('.icon').style.borderColor = isVirtual ? '#89dceb' : '#89b4fa';
            }
        }
        
        availableServers = servers;
        drawRoutes();
    }

    function drawRoutes() {
        let linesHTML = '';
        ['c1', 'c2', 'c3'].forEach(c => linesHTML += `<path class="line active" d="M ${pos[c].x} ${pos[c].y} L ${pos.lb.x} ${pos.lb.y}" />`);
        availableServers.forEach(s => linesHTML += `<path class="line active" d="M ${pos.lb.x} ${pos.lb.y} L ${pos[s].x} ${pos[s].y}" />`);
        
        if (isShared) {
            availableServers.forEach(s => linesHTML += `<path class="line" d="M ${pos[s].x} ${pos[s].y} L ${pos.db_master.x} ${pos.db_master.y}" />`);
            if (isReplicating) {
                linesHTML += `<path class="line active" stroke-dasharray="2" stroke="#f9e2af" d="M ${pos.db_master.x} ${pos.db_master.y} L ${pos.db_replica.x} ${pos.db_replica.y}" />`;
            }
        }
        svgLines.innerHTML = linesHTML;
    }
    
    updateAvailableServers();

    /* --- NOVOS CONTROLES (Virtualização e Tolerância a Falhas) --- */

    const btnVirt = document.getElementById('btn-virt');
    if (btnVirt) {
        btnVirt.addEventListener('change', e => {
            isVirtual = e.target.checked;
            document.querySelectorAll('.server').forEach(el => {
                const icon = el.querySelector('.icon');
                const label = el.querySelector('.label');
                icon.innerHTML = isVirtual ? svgs.docker : svgs.server;
                // Muda a cor para ciano (Containers) ou azul (Servidor Baremetal)
                if(!el.classList.contains('server-locked')) {
                    icon.style.borderColor = isVirtual ? '#89dceb' : '#89b4fa'; 
                }
                label.innerText = isVirtual ? label.innerText.replace('SERVER', 'CONTAINER') : label.innerText.replace('CONTAINER', 'SERVER');
            });
        });
    }

    const btnCrash = document.getElementById('btn-crash');
    if (btnCrash) {
        btnCrash.addEventListener('change', e => {
            isCrashed = e.target.checked;
            updateAvailableServers();
            
            // Se o único servidor caiu, demonstra Falha de Omissão (Indisponibilidade)
            if (availableServers.length === 0) {
                alert("Falha Crítica! O Servidor 1 caiu e o sistema perdeu a disponibilidade.\n\nLigue a 'Escalabilidade' (Redundância/Nuvem) para ativar o Load Balancer e demonstrar o Mascaramento de Falhas (Failover).");
            }
        });
    }

    /* --- CONTROLES EXISTENTES --- */

    document.getElementById('btn-aber').addEventListener('change', e => {
        const c2 = document.getElementById('c2'); const c3 = document.getElementById('c3');
        if(e.target.checked) {
            c2.querySelector('.icon').innerHTML = svgs.mobile; c2.querySelector('.label').innerText = 'MOBILE APP';
            c3.querySelector('.icon').innerHTML = svgs.api; c3.querySelector('.label').innerText = 'PYTHON SCRIPT';
        } else {
            c2.querySelector('.icon').innerHTML = svgs.laptop; c2.querySelector('.label').innerText = 'CLIENTE 2';
            c3.querySelector('.icon').innerHTML = svgs.laptop; c3.querySelector('.label').innerText = 'CLIENTE 3';
        }
    });

    document.getElementById('btn-tls').addEventListener('change', e => { isTLS = e.target.checked; });

    document.getElementById('btn-loc').addEventListener('change', e => {
        const cloud = document.getElementById('cloud-box');
        if(e.target.checked) {
            cloud.style.opacity = '1';
            cloud.style.left = '180px'; cloud.style.top = '40px';
            cloud.style.width = '550px'; cloud.style.height = '620px';
        } else { cloud.style.opacity = '0'; }
    });

    document.getElementById('btn-comp').addEventListener('change', e => {
        isShared = e.target.checked;
        const db = document.getElementById('db_master');
        isShared ? db.classList.remove('hidden') : db.classList.add('hidden');
        
        if(!isShared && document.getElementById('btn-rep').checked) {
            document.getElementById('btn-rep').checked = false;
            document.getElementById('btn-rep').dispatchEvent(new Event('change'));
        }
        drawRoutes();
    });

    document.getElementById('btn-rep').addEventListener('change', e => {
        isReplicating = e.target.checked;
        if (isReplicating && !document.getElementById('btn-comp').checked) {
            document.getElementById('btn-comp').checked = true;
            document.getElementById('btn-comp').dispatchEvent(new Event('change'));
        }
        const rep = document.getElementById('db_replica');
        isReplicating ? rep.classList.remove('hidden') : rep.classList.add('hidden');
        drawRoutes();
    });

    document.getElementById('btn-mig').addEventListener('change', e => {
        const s1 = document.getElementById('s1'); const s2 = document.getElementById('s2');
        if(e.target.checked) {
            document.getElementById('btn-esc').checked = false;
            document.getElementById('btn-reloc').checked = false;
            s1.classList.add('hidden');
            s2.classList.remove('hidden'); s2.querySelector('.label').innerText = isVirtual ? 'CONTAINER 2 (MIGRADO)' : 'SERVER 2 (MIGRADO)';
            document.getElementById('s3').classList.add('hidden');
        } else {
            s1.classList.remove('hidden'); s2.classList.add('hidden');
        }
        isScale = false;
        updateAvailableServers();
    });

    document.getElementById('btn-reloc').addEventListener('change', e => {
        const s1 = document.getElementById('s1');
        if(e.target.checked) {
            document.getElementById('btn-mig').checked = false;
            pos.s1.y = 450;
            s1.style.top = '450px';
            s1.querySelector('.label').innerText = isVirtual ? 'CONTAINER 1 (RELOCADO)' : 'SERVER 1 (RELOCADO)';
        } else {
            pos.s1.y = 350;
            s1.style.top = '350px';
            s1.querySelector('.label').innerText = isVirtual ? 'CONTAINER 1' : 'SERVER 1';
        }
        updateAvailableServers();
    });

    document.getElementById('btn-esc').addEventListener('change', e => {
        isScale = e.target.checked;
        const s2 = document.getElementById('s2'); const s3 = document.getElementById('s3');
        if(isScale) {
            document.getElementById('btn-mig').checked = false;
            document.getElementById('btn-reloc').checked = false;
            pos.s1.y = 350; document.getElementById('s1').style.top = '350px';
            document.getElementById('s1').classList.remove('hidden');
            s2.classList.remove('hidden'); s2.querySelector('.label').innerText = isVirtual ? 'CONTAINER 2' : 'SERVER 2';
            s3.classList.remove('hidden');
        } else {
            s2.classList.add('hidden'); s3.classList.add('hidden');
        }
        updateAvailableServers();
    });

    const tglConc = document.getElementById('btn-conc');

    /* --- ANIMAÇÃO DOS PACOTES --- */

    function spawnPacket(start, end, isSyncPacket = false, delay = 0) {
        setTimeout(() => {
            const p = document.createElement('div');
            p.className = 'packet';
            
            if (isTLS && !isSyncPacket) {
                p.style.backgroundColor = '#a6e3a1'; p.style.boxShadow = '0 0 10px #a6e3a1';
            } else if (isSyncPacket) {
                p.style.backgroundColor = '#f9e2af'; p.style.boxShadow = '0 0 10px #f9e2af';
                p.style.width = '8px'; p.style.height = '8px';
            } else {
                p.style.backgroundColor = '#cba6f7'; p.style.boxShadow = '0 0 10px #cba6f7';
            }

            p.style.left = pos[start].x + 'px'; p.style.top = pos[start].y + 'px';
            canvas.appendChild(p);

            const animation = p.animate([
                { transform: `translate(0px, 0px)` }, 
                { transform: `translate(${pos[end].x - pos[start].x}px, ${pos[end].y - pos[start].y}px)` }
            ], { duration: 1000, easing: 'linear' });

            animation.onfinish = () => {
                p.remove();
                
                if (end === 'lb') {
                    // Failover logic / Load Balancing logic
                    if (availableServers.length > 0) {
                        const nextServer = availableServers[Math.floor(Math.random() * availableServers.length)];
                        spawnPacket('lb', nextServer, false);
                    } else {
                        // Omissão / Drop do pacote (Sistema indisponível)
                        const dropIcon = document.createElement('div');
                        dropIcon.innerHTML = '❌';
                        dropIcon.style.position = 'absolute';
                        dropIcon.style.left = (pos.lb.x - 5) + 'px';
                        dropIcon.style.top = (pos.lb.y - 20) + 'px';
                        dropIcon.style.color = '#f38ba8';
                        dropIcon.style.fontSize = '14px';
                        dropIcon.style.zIndex = 10;
                        canvas.appendChild(dropIcon);
                        setTimeout(() => dropIcon.remove(), 800);
                    }
                } 
                else if (end.startsWith('s') && isShared) {
                    spawnPacket(end, 'db_master', false);
                }
                else if (end === 'db_master') {
                    if (tglConc.checked) {
                        const dbEl = document.getElementById('db_master');
                        dbEl.classList.add('server-locked');
                        setTimeout(() => dbEl.classList.remove('server-locked'), 250);
                    }
                    if (isReplicating) { spawnPacket('db_master', 'db_replica', true); }
                }
            };
        }, delay);
    }

    setInterval(() => {
        const conc = tglConc && tglConc.checked;
        spawnPacket('c1', 'lb', false, 0);
        spawnPacket('c2', 'lb', false, conc ? 0 : 400);
        spawnPacket('c3', 'lb', false, conc ? 0 : 800);
    }, 2000);
});
