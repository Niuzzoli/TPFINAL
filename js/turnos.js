document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // 0. ESTADO PREDETERMINADO DE LA RESERVA
    // =========================================
    const reservaData = {
        nombre: '',
        telefono: '',
        email: '',
        servicio: '',
        precio: '',
        duracion: '', 
        barbero: 'Sin preferencia',
        fecha: '',
        hora: ''
    };

    const BARBEROS = ['Carlos Mendoza', 'Miguel Ángel Torres', 'Andres Rivera', 'Diego Fernández'];

    // =========================================
    // FUNCIÓN GLOBAL PARA CAMBIAR DE PASO
    // =========================================
    function avanzarAlPaso(pasoActual, pasoSiguiente) {
        document.getElementById(`step-${pasoActual}`).classList.remove('active');
        document.getElementById(`step-${pasoSiguiente}`).classList.add('active');

        const circuloActual = document.querySelector(`.step[data-step="${pasoActual}"]`);
        const circuloSiguiente = document.querySelector(`.step[data-step="${pasoSiguiente}"]`);

        if(circuloActual){
            circuloActual.classList.remove('active');
        }
        if(circuloSiguiente){
            circuloSiguiente.classList.add('active');
        }

        const lineas = document.querySelectorAll('.step-line');

        if(pasoSiguiente > pasoActual) {
            if (circuloActual) circuloActual.classList.add('completed');
            if (lineas[pasoActual - 1]) lineas[pasoActual - 1].classList.add('active');
        } else {
            if (circuloSiguiente) circuloSiguiente.classList.remove('completed');
            if (lineas[pasoSiguiente - 1]) lineas[pasoSiguiente - 1].classList.remove('active');
        }
    }

    // =========================================
    // FUNCIONES DE TURNOS (LOCALSTORAGE)
    // =========================================
    function getTurnos() {
        return JSON.parse(localStorage.getItem('turnos') || '[]');
    }

    function saveTurno(turno) {
        const turnos = getTurnos();
        turnos.push(turno);
        localStorage.setItem('turnos', JSON.stringify(turnos));
    }

    // Devuelve cuántos slots de 30 min ocupa una duración dada
    function getSlotsNecesarios(duracion) {
        return Math.ceil(Number(duracion) / 30);
    }

    // Aca se calcula la disponibilidad de los barberos para una fecha y horario del dia, se tiene en cuenta la duracion de cada turno tambien
    function getOcupacion(fecha) {
        // Aca creamos la estructura, cada horario apunta vacio que lo que hace ese set es evitar que los barberos tengan dos reservas en un mismo horario  
        const ocupacion = {};
        horariosFijos.forEach(h => ocupacion[h] = new Set());

        // Aca agarramos solo los turnos que tenemos guardados
        getTurnos()
            .filter(t => t.fecha === fecha)
            .forEach(t => {

                // Buscamos en que posicion del array horariofijo arranca el turno 
                const startIdx = horariosFijos.indexOf(t.hora);
                if (startIdx === -1) return; // Aca si la hora no existe en el array lo salta 
                // Aca se calcula cuantos slots ocupa una reserva, si dura mas de media hora ocupa dos slots
                const slots = getSlotsNecesarios(t.duracion);

                // Aca es donde marcamos como ocupado cada slot que se haya reservado 
                for (let k = 0; k < slots; k++) {
                    const idx = startIdx + k;
                    if (idx < horariosFijos.length) {
                        ocupacion[horariosFijos[idx]].add(t.barbero);
                    }
                }
            });

        return ocupacion; // Se devuelve el objeto completo
    }

    // Aca se verifica que barberos estan disponibles dado los slots reservados
    function barberosLibresEnRango(ocupacion, horaInicio, slotsNecesarios) {
        // Buscamos la posicion del array en la que arranca el slot 
        const startIdx = horariosFijos.indexOf(horaInicio);
        if (startIdx === -1) return [];

        // Si el turno dura mas de media hora hace que no entre en el ultimo slot del dia 
        if (startIdx + slotsNecesarios > horariosFijos.length) return []; // no entra antes del cierre

        // Asumimos que todos los barberos estan libres
        let libres = [...BARBEROS];

        // Recorremos cada slot que el turno va a ocupar (si dura 60 min, son 2 vueltas: k=0 y k=1)
        for (let k = 0; k < slotsNecesarios; k++) {
            // Calculamos a la hora exacta corresponde este slot (startIdx + k)
            const hora = horariosFijos[startIdx + k];
            // De la lista "libres", sacamos a cualquier barbero que ya este ocupado en esta hora puntual
            // ocupacion[hora] es el set de barberos ocupados a esa hora (lo armamos en getOcupacion)
            // .has(b) chequea si el barbero "b" está en ese set de ocupados
            // El ! invierte: nos quedamos solo con los que no están ocupados
            libres = libres.filter(b => !ocupacion[hora].has(b));
        }
        // Al final se devuelve los barberos que pasaron a todos estos filtros, osea los que estan disponibles
        return libres;
    }

    // Aca es donde se decide que horarios mostrar en caso de si estan seleccionados o no 
    function esHoraDisponible(fecha, hora, barberoSeleccionado, duracion) {
        // Se calcula la operacion de todos los barberos para el dia 
        const ocupacion = getOcupacion(fecha);
        // Convertimos la duracion del servicio en cantidad de slots, es decir si dura mas de 30 mins van a ser dos slots 
        const slotsNecesarios = getSlotsNecesarios(duracion); // Se convierte el servicio en slot
        const libres = barberosLibresEnRango(ocupacion, hora, slotsNecesarios); // Obtenemos los barberos libres 

        if (barberoSeleccionado === 'Sin preferencia') {
            return libres.length > 0; // Si no elige barbero ponemos el horario como disponible con al menos un barbero disponible 
        } else {
            return libres.includes(barberoSeleccionado); // Si elije un barbero verificamos que ese en especifico tenga horario disponible
        }
    }

    // Asigna el barbero real al confirmar (si era "Sin preferencia", elige el primero libre)
    function asignarBarbero(fecha, hora, barberoSeleccionado, duracion) {
        // Si no elije sin preferencia direcamente devolvemos el barbero seleccionado 
        if (barberoSeleccionado !== 'Sin preferencia') return barberoSeleccionado;

        const ocupacion = getOcupacion(fecha); // Vemos la ocupacion de todos los barberos en el dia elegido
        const slotsNecesarios = getSlotsNecesarios(duracion); // Pasamos la duracion de servicio a slots
        const libres = barberosLibresEnRango(ocupacion, hora, slotsNecesarios); // Obtenemos que barberos estan libres 
        return libres[0] || barberoSeleccionado; // Devolvemos al primer barbero con disponibilidad 
    }

    // Chequea si una hora ya pasó (solo aplica si la fecha elegida es HOY)
    function esHoraPasada(fecha, hora) {
        // Obtenemos la fecha y la pasamos al formato YYYY-MM-DD que es lo que entiende JS
        const hoy = new Date();
        const fechaHoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

        // Aca verificamos que si la fecha no es hoy directamente cortamos asi no calcula inncesariamente
        if (fecha !== fechaHoyStr) return false;

        // Convertimos los minutos en slots
        const [h, m] = hora.split(':').map(Number);
        const slotMinutos = h * 60 + m;
        const ahoraMinutos = hoy.getHours() * 60 + hoy.getMinutes();

        // Y si los minutos de slots son mayores al tiempo actual devuelve false, por lo tanto el horario esta disponible
        return slotMinutos <= ahoraMinutos;
    }

    // =========================================
    // PASO 1: DATOS PERSONALES
    // =========================================
    const inputNombre = document.getElementById('res-nombre');
    const inputTelefono = document.getElementById('res-telefono');
    const inputEmail = document.getElementById('res-email');
    const btnSiguientePaso1 = document.getElementById('btn-next-step1');

    const errorTelefono = document.getElementById('error-telefono');
    const errorEmail = document.getElementById('error-email');

    const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const regexNumeros = /^[\+0-9\-\s]+$/;

    function mostrarError(inputEl, errorEl, mensaje) {
        if (errorEl) {
            errorEl.innerText = mensaje;
            errorEl.classList.add('visible');
        }
        if (inputEl) {
            inputEl.classList.add('input-invalid');
        }
    }

    function ocultarError(inputEl, errorEl) {
        if (errorEl) {
            errorEl.innerText = '';
            errorEl.classList.remove('visible');
        }
        if (inputEl) {
            inputEl.classList.remove('input-invalid');
        }
    }

    function verificarCamposObligatorios() {
        const nombreLleno = inputNombre.value.trim().length > 0;
        const telefonoLleno = inputTelefono.value.trim().length > 0;
        if (btnSiguientePaso1) {
            btnSiguientePaso1.disabled = !(nombreLleno && telefonoLleno);
        }
    }

    if (inputNombre && inputTelefono) {
        inputNombre.addEventListener('input', verificarCamposObligatorios);
        inputTelefono.addEventListener('input', () => {
            verificarCamposObligatorios();
            ocultarError(inputTelefono, errorTelefono);
        });
    }

    if (inputEmail) {
        inputEmail.addEventListener('input', () => ocultarError(inputEmail, errorEmail));
    }

    if (btnSiguientePaso1) {
        btnSiguientePaso1.addEventListener('click', () => {
            const nombreVal = inputNombre.value.trim();
            const telefonoVal = inputTelefono.value.trim();
            const emailVal = inputEmail.value.trim().toLowerCase();

            ocultarError(inputTelefono, errorTelefono);
            ocultarError(inputEmail, errorEmail);

            if (!regexLetras.test(nombreVal)) {
                alert('El nombre solo debe contener letras.');
                inputNombre.focus();
                return;
            }

            let hayError = false;

            if (!regexNumeros.test(telefonoVal)) {
                mostrarError(inputTelefono, errorTelefono, 'El teléfono solo debe contener números.');
                hayError = true;
            }

            if (emailVal !== '') {
                const dominiosValidos = ['@gmail.com', '@hotmail.com', '@yahoo.com', '@outlook.com'];
                const esEmailValido = dominiosValidos.some(dominio => emailVal.endsWith(dominio));
                const tieneUsuario = emailVal.indexOf('@') > 0;
                if (!esEmailValido || !tieneUsuario) {
                    mostrarError(inputEmail, errorEmail, 'El mail tiene que ser en alguno de estos formatos: @gmail, @hotmail, @yahoo.com, @outlook.com.');
                    hayError = true;
                }
            }

            if (hayError) {
                if (errorTelefono && errorTelefono.classList.contains('visible')) {
                    inputTelefono.focus();
                } else if (errorEmail && errorEmail.classList.contains('visible')) {
                    inputEmail.focus();
                }
                return;
            }

            reservaData.nombre = nombreVal;
            reservaData.telefono = telefonoVal;
            reservaData.email = emailVal;
            avanzarAlPaso(1, 2);
        });
    }

    // =========================================
    // PASO 2: SERVICIO Y BARBERO
    // =========================================
    const servicioCards = document.querySelectorAll('.servicio-card');
    const barberoBtns = document.querySelectorAll('.barbero-btn');
    const btnSiguientePaso2 = document.getElementById('btn-next-step2');
    const btnAnteriorPaso2 = document.getElementById('btn-prev-step2');

    servicioCards.forEach(card => {
        card.addEventListener('click', () => {
            servicioCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            reservaData.servicio = card.getAttribute('data-servicio');
            reservaData.precio = card.getAttribute('data-precio');
            reservaData.duracion = card.getAttribute('data-duracion'); 
            if (btnSiguientePaso2) {
                btnSiguientePaso2.disabled = false;
            }

            if (reservaData.fecha !== '') {
                reservaData.hora = '';
                verificarPaso3();
                mostrarHorarios();
            }
        });
    });

    barberoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            barberoBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            reservaData.barbero = btn.innerText.trim();

            // Si ya hay una fecha elegida se recargan los horarios
            if (reservaData.fecha !== '') {
                reservaData.hora = '';
                verificarPaso3();
                mostrarHorarios();
            }
        });
    });

    if (btnAnteriorPaso2) {
        btnAnteriorPaso2.addEventListener('click', () => avanzarAlPaso(2, 1));
    }
    if (btnSiguientePaso2) {
        btnSiguientePaso2.addEventListener('click', () => avanzarAlPaso(2, 3));
    }

    // =========================================
    // PASO 3: CALENDARIO Y HORARIOS
    // =========================================
    const monthYear = document.getElementById('month-year');
    const calendarDays = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    const horariosMsj = document.getElementById('horarios-mensaje');
    const horariosGrid = document.getElementById('horarios-grid');
    const btnSiguientePaso3 = document.getElementById('btn-next-step3');
    const btnAnteriorPaso3 = document.getElementById('btn-prev-step3');

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const horariosFijos = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

    let fechaHoy = new Date();
    let mesActual = fechaHoy.getMonth();
    let anioActual = fechaHoy.getFullYear();

    function renderCalendar(mes, anio) {
        if (!calendarDays) return; // Si no encuentra el calendario directamente no va a ejecutar
        calendarDays.innerHTML = '';
        monthYear.innerText = `${meses[mes]} De ${anio}`;

        let primerDiaNativo = new Date(anio, mes, 1).getDay();
        let primerDiaAjustado = primerDiaNativo === 0 ? 6 : primerDiaNativo - 1; // En js por defecto el dia 0 es el domingo, esto es para que sea el lunes
        const diasEnMes = new Date(anio, mes + 1, 0).getDate(); // Esto sirve para saber cual es el ultimo dia del mes y asi sabremos cuantos dias tiene

        for (let i = 0; i < primerDiaAjustado; i++) {
            calendarDays.appendChild(document.createElement('div'));
        }

        for (let i = 1; i <= diasEnMes; i++) {
            const btnDia = document.createElement('button');
            btnDia.type = 'button';
            btnDia.classList.add('day-btn');
            btnDia.innerText = i;

            const fechaIteracion = new Date(anio, mes, i);
            const diaSemana = fechaIteracion.getDay();
            
            // Esto sirve para verificar cuales son los dias pasados al de hoy para marcarlos como deshabilitados para seleccionarlos  
            fechaIteracion.setHours(0, 0, 0, 0);
            const hoyLimpio = new Date();
            hoyLimpio.setHours(0, 0, 0, 0);

            const esPasado = fechaIteracion < hoyLimpio;
            const esDomingoOLunes = diaSemana === 0 || diaSemana === 1;

            if (esPasado || esDomingoOLunes) {
                btnDia.classList.add('disabled');
            } else {
                btnDia.addEventListener('click', () => {
                    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
                    btnDia.classList.add('selected');

                    const mesFormat = String(mes + 1).padStart(2, '0'); // Lo paso a string porque el padStart trabaja solo con strings y lo necesito para que la longitud sea minimo de 2, esto lo necesito para que se respete el formato de fecha que tiene JS 
                    const diaFormat = String(i).padStart(2, '0');
                    reservaData.fecha = `${anio}-${mesFormat}-${diaFormat}`; // Arma la fecha completa 

                    reservaData.hora = ''; // Vacia la hora
                    verificarPaso3(); // Como la hora esta vacia deshabilita el btn siguiente 
                    mostrarHorarios(); // Vuelve a dibujar la grilla de los horarios pero calculando la reserva nueva
                });
            }
            calendarDays.appendChild(btnDia);
        }
    }

    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            mesActual--;
            if (mesActual < 0) { mesActual = 11; anioActual--; }
            renderCalendar(mesActual, anioActual);
            ocultarHorarios();
        });

        nextMonthBtn.addEventListener('click', () => {
            mesActual++;
            if (mesActual > 11) { mesActual = 0; anioActual++; }
            renderCalendar(mesActual, anioActual);
            ocultarHorarios();
        });
    }

    function mostrarHorarios() {
        if (!horariosMsj || !horariosGrid) return;
        horariosMsj.style.display = 'none';
        horariosGrid.style.display = 'grid';
        horariosGrid.innerHTML = '';

        horariosFijos.forEach(hora => {
            const btnHora = document.createElement('button');
            btnHora.type = 'button';
            btnHora.classList.add('hora-btn');
            btnHora.innerText = hora;

            const pasada = esHoraPasada(reservaData.fecha, hora);
            const disponible = !pasada && esHoraDisponible(reservaData.fecha, hora, reservaData.barbero, reservaData.duracion);

            if (!disponible) {
                btnHora.classList.add('disabled');
                btnHora.disabled = true;
            } else {
                btnHora.addEventListener('click', () => {
                    document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('selected'));
                    btnHora.classList.add('selected');
                    reservaData.hora = hora;
                    verificarPaso3();
                });
            }

            horariosGrid.appendChild(btnHora);
        });
    }

    function ocultarHorarios() {
        if (!horariosMsj || !horariosGrid) return;
        horariosMsj.style.display = 'block';
        horariosGrid.style.display = 'none';
        reservaData.fecha = '';
        reservaData.hora = '';
        verificarPaso3();
    }

    function verificarPaso3() {
        if (btnSiguientePaso3) {
            btnSiguientePaso3.disabled = !(reservaData.fecha !== '' && reservaData.hora !== '');
        }
    }

    renderCalendar(mesActual, anioActual);

    if (btnAnteriorPaso3) btnAnteriorPaso3.addEventListener('click', () => avanzarAlPaso(3, 2));

    // =========================================
    // PASO 4: RESUMEN Y CONFIRMACIÓN
    // =========================================
    const btnAnteriorPaso4 = document.getElementById('btn-prev-step4');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const step4 = document.getElementById('step-4');
    const stepSuccess = document.getElementById('step-success');

    if (btnSiguientePaso3) {
        btnSiguientePaso3.addEventListener('click', () => {
            document.getElementById('sum-nombre').innerText = reservaData.nombre;
            document.getElementById('sum-telefono').innerText = reservaData.telefono;
            document.getElementById('sum-email').innerText = reservaData.email !== '' ? reservaData.email : '-';
            document.getElementById('sum-servicio').innerText = reservaData.servicio;
            document.getElementById('sum-barbero').innerText = reservaData.barbero;

            const partes = reservaData.fecha.split('-');
            const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]);
            const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            document.getElementById('sum-fecha').innerText = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
            document.getElementById('sum-hora').innerText = reservaData.hora + ' hs';
            document.getElementById('sum-total').innerText = '$' + reservaData.precio;

            avanzarAlPaso(3, 4);
        });
    }

    if (btnAnteriorPaso4) {
        btnAnteriorPaso4.addEventListener('click', () => avanzarAlPaso(4, 3));
    }

    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            const barberoFinal = asignarBarbero(reservaData.fecha, reservaData.hora, reservaData.barbero, reservaData.duracion);

            saveTurno({
                barbero: barberoFinal,
                fecha: reservaData.fecha,
                hora: reservaData.hora,
                duracion: Number(reservaData.duracion)
            });

            document.getElementById('sum-barbero').innerText = barberoFinal;

            document.querySelector('.stepper').style.display = 'none';
            if (step4) step4.classList.remove('active');

            if (stepSuccess) {
                stepSuccess.classList.add('active');
                const textoConf = stepSuccess.querySelector('p');
                if (textoConf) {
                    textoConf.innerHTML = `Te esperamos el <strong>${document.getElementById('sum-fecha').innerText}</strong> a las <strong>${reservaData.hora} hs</strong>.`;
                }
            }

            
            document.getElementById('reservas').scrollIntoView({ behavior: 'smooth' });
        });
    }

    const btnNuevaReserva = document.getElementById('btn-nueva-reserva');
    if (btnNuevaReserva) {
        btnNuevaReserva.addEventListener('click', () => location.reload());
    }

});