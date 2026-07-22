# Prompt de implementación: apuestas opcionales por jornada con Solana

Actúa como un ingeniero principal full-stack y blockchain con experiencia en Next.js 16, React 19, Supabase/Postgres con RLS, Solana y programas on-chain seguros. Trabaja directamente sobre este repositorio de Winscore y entrega una integración completa, probada y documentada para permitir apuestas opcionales por jornada dentro de una quiniela privada.

No hagas una integración genérica. Primero inspecciona el código, las migraciones y las especificaciones actuales, y conserva la arquitectura, el diseño visual, la internacionalización y las reglas de negocio existentes.

## Objetivo del producto

Añade a Winscore la posibilidad de crear pozos de apuestas en Solana para cada jornada de una liga y cada pool privado (la entidad que hoy se llama `group`). La participación con dinero debe ser totalmente opcional:

- Crear, enviar y editar pronósticos gratuitos debe seguir funcionando exactamente como ahora, sin conectar una wallet.
- Al crear un pool, su dueño puede habilitar opcionalmente “Apuestas por jornada”. Debe estar deshabilitado por defecto.
- Si se habilita, el dueño configura una cantidad fija por jornada usando un único token SPL permitido por la aplicación. No permitas que el usuario introduzca libremente un mint.
- Al completar y enviar la quiniela de una jornada, cada miembro ve un control desactivado por defecto: “Participar con apuesta en esta jornada”.
- Si el miembro no lo activa, se guardan sus pronósticos gratuitos y no se ejecuta ninguna acción de wallet o blockchain.
- Si lo activa, debe tener todos los pronósticos de la jornada completos, conectar y vincular una wallet, revisar importe, token, red, comisión estimada, cierre y reglas, aceptar expresamente y firmar el depósito.
- Un miembro puede apostar en una jornada y no hacerlo en otra. También puede participar gratis en un pool que tenga apuestas habilitadas.
- La apuesta corresponde al par `pool + jornada`, no a un partido individual ni a la clasificación completa de la liga.
- El 100 % del pozo se reparte entre los ganadores del primer puesto. No añadas comisión de plataforma en el MVP.

La experiencia gratuita es el comportamiento base. Ningún error de wallet, RPC, confirmación o programa debe impedir que los pronósticos gratuitos válidos se guarden.

## Contexto real del repositorio que debes respetar

- Stack actual: Next.js `16.2.11` App Router, React `19.2.8`, TypeScript, Tailwind CSS 4, shadcn/ui, `next-intl`, Supabase Auth/Postgres/RLS y Vercel.
- Antes de escribir código Next.js, lee `AGENTS.md` y las guías relevantes instaladas en `node_modules/next/dist/docs/`, especialmente Server Actions, Route Handlers, formularios, autenticación y caché. No te bases en APIs de memoria.
- Las lecturas se hacen principalmente en React Server Components; las mutaciones de usuario usan Server Actions con el cliente Supabase de sesión. Los webhooks o endpoints externos deben usar Route Handlers.
- La conexión de wallet, el firmado y las APIs del navegador deben quedar en Client Components pequeños. No conviertas páginas completas en Client Components.
- No inicialices SDKs que dependan de variables de entorno en módulos evaluados durante el build del servidor. Usa inicialización perezosa donde corresponda.
- La autenticación de Winscore sigue siendo Supabase Auth. Una wallet vinculada no sustituye la sesión del usuario.
- Los pools privados reutilizan `groups` y están ligados a una sola `competition_id`; no crees una segunda entidad de pools.
- Los pronósticos actuales viven en `predictions`, uno por usuario y partido, y se bloquean en la base de datos al llegar el `kickoff_at`.
- Los resultados calculados viven en `scores`. La fuente de verdad en runtime es `public.compute_match_scores`; `lib/scoring.ts` es su réplica TypeScript para pruebas.
- El proyecto todavía no modela una “jornada” de liga como entidad persistente. No la infieras únicamente por fecha o semana de calendario.
- La UI y los mensajes existen en inglés, español, francés y alemán. Toda superficie nueva debe añadirse a los cuatro idiomas.
- Conserva la dirección visual “matchday board”, sus tokens semánticos y los componentes shadcn existentes.
- Genera o actualiza `lib/database.types.ts` después de estabilizar las migraciones; no escribas casts para ocultar tipos desactualizados.

Revisa, como mínimo, estos archivos antes de diseñar:

- `lib/scoring.ts`
- `lib/competition-schema.ts`
- `lib/groups.ts`
- `app/[locale]/(app)/groups/group-forms.tsx`
- `app/[locale]/(app)/groups/actions.ts`
- `app/[locale]/(app)/groups/[id]/page.tsx`
- `app/[locale]/[league]/(public)/matches/[matchId]/actions.ts`
- `app/[locale]/[league]/(public)/matches/[matchId]/prediction-form.tsx`
- `supabase/migrations/20260513000000_init.sql`
- `supabase/migrations/20260620020004_group_join_date_scoring.sql`
- `supabase/migrations/20260716000000_liga_mx_tie_key_leg.sql`
- `supabase/migrations/20260722000100_pool_create_league_guard.sql`
- `docs/architecture.md`
- `docs/data-model.md`
- `messages/en.json`, `messages/es.json`, `messages/fr.json` y `messages/de.json`

## Regla de puntuación: no debe divergir

La apuesta debe usar exactamente la misma puntuación que la quiniela normal:

- Marcador exacto: 5 puntos base.
- Ganador o empate correcto y diferencia de goles exacta: 3 puntos base.
- Ganador o empate correcto: 1 punto base.
- Resultado incorrecto: 0 puntos.
- Multiplica los puntos base por el `pointMultiplier` de la fase definido en `competitions.format_config.stages[]`. Conserva el fallback actual si no existe configuración.

Para cada jornada, suma únicamente los puntos de sus partidos. Aplica los mismos desempates canónicos que usa actualmente la clasificación del pool: puntos totales, aciertos exactos, aciertos de ganador más diferencia y el timestamp de envío correspondiente, en el mismo orden y con la misma semántica que tenga la función SQL vigente. Verifica el SQL real; no copies una descripción que pueda estar desactualizada.

No mantengas dos implementaciones SQL independientes de la fórmula. Extrae una primitiva canónica reutilizable y testeable —por ejemplo, una función SQL pura que puntúe un pronóstico contra un resultado y una función agregadora por jornada— y haz que tanto `compute_match_scores` como el cálculo de la apuesta la utilicen. Mantén `lib/scoring.ts` en paridad y añade pruebas de contrato SQL/TypeScript.

Si varias personas conservan el rango 1 después de todos los desempates, divide el pozo en partes iguales. Opera siempre en unidades enteras mínimas del token. Define y prueba una regla determinista para el residuo de redondeo, ordenando las direcciones ganadoras por bytes y asignando una unidad adicional a las primeras hasta agotar el residuo.

## Modelado obligatorio de jornadas

Crea una entidad explícita y estable para jornadas. Diseña nombres finales coherentes con el repositorio, pero cubre estas responsabilidades:

- `competition_rounds`: liga, clave estable de jornada, nombre localizado o número, orden, apertura, fecha de cierre, estado y timestamps.
- Relación inequívoca entre cada `match` y una jornada, mediante `round_id` o una tabla de unión si justificas que un partido puede pertenecer a más de una unidad competitiva.
- Una restricción única por `competition_id + round_key`.
- Índices para liga, estado, cierre y consultas del dashboard.
- Herramienta de administración para crear, editar, asignar y revisar jornadas.
- Adaptación de los sincronizadores de partidos para conservar la jornada del proveedor cuando sea fiable y dejar una cola/revisión administrativa cuando no lo sea.

No agrupes partidos solo con `date(kickoff_at)`, semana ISO o proximidad temporal. Ligas distintas y partidos aplazados hacen que esa inferencia sea incorrecta.

El cierre de una apuesta es el `kickoff_at` más temprano de todos los partidos activos de la jornada, salvo que una fecha de cierre administrativa anterior esté configurada. Una apuesta nunca puede abrirse o confirmarse después de ese instante usando el reloj del cliente.

## Pronósticos apostados inmutables

El modelo actual permite editar cada pronóstico hasta el inicio de su partido. Eso se mantiene para las quinielas gratuitas, pero sería injusto para una apuesta de jornada después de que empiecen los primeros partidos.

Cuando el usuario decide apostar:

1. Exige que haya pronosticado todos los partidos elegibles de la jornada.
2. Antes del primer kickoff, crea una copia inmutable de esos pronósticos en `wager_entry_predictions` o una entidad equivalente.
3. Canonicaliza esa copia de forma determinista y calcula un `pick_commitment` SHA-256.
4. Incluye ese compromiso en la entrada on-chain.
5. Para puntuar la apuesta usa únicamente la copia inmutable, nunca las filas mutables de `predictions`.
6. Las ediciones gratuitas posteriores de partidos que aún no hayan comenzado no modifican la apuesta ni su compromiso.

Documenta claramente esta diferencia en la interfaz.

## Arquitectura de Solana

Usa la documentación oficial vigente al implementar. A julio de 2026, la documentación oficial recomienda `@solana/kit`, sus plugins, `@solana/react` y Wallet Standard para trabajo nuevo; `@solana/web3.js` v1 y `@solana/wallet-adapter-*` aparecen como legado. Verifica versiones y APIs otra vez antes de instalarlas.

Referencias oficiales iniciales:

- https://solana.com/docs/frontend
- https://solana.com/docs/frontend/nextjs-solana
- https://solana.com/docs/tokens/basics/transfer-tokens
- https://solana.com/docs/references/clusters
- https://solana.com/docs/core/pda

Implementa primero en Solana Devnet. Los tokens de Devnet no tienen valor real y la red puede reiniciarse. No actives Mainnet ni fondos reales sin una solicitud explícita posterior, auditoría del programa y aprobación legal/compliance.

### Activo del MVP

- Soporta un solo mint SPL configurable y permitido por despliegue.
- Usa un token de prueba en Devnet. No hardcodees una dirección de USDC de Mainnet ni asumas sus decimales.
- Lee y valida el mint, programa de token y decimales on-chain.
- Para transferencias SPL usa instrucciones checked (`TransferChecked` o la equivalente vigente) y cantidades `bigint` en unidades base; nunca `number` flotante.
- Si más adelante se elige Token-2022, valida explícitamente extensiones como transfer fees, permanent delegate, freeze authority o transfer hooks. Para el MVP rechaza mints con extensiones que cambien el importe o la autoridad salvo soporte intencional y probado.

### Programa de escrow no custodial

No envíes apuestas a una wallet común controlada por el backend. Implementa un programa de Solana dedicado y versionado, con una cuenta PDA de escrow por `pool + jornada` y cuentas de entrada/reclamación derivadas de forma determinista.

El programa debe cubrir, con nombres idiomáticos y validaciones completas, estas transiciones:

- `initialize_wager_round`: crea el escrow con identificadores del pool/jornada, mint permitido, stake exacto, cierre, autoridad de liquidación y versión.
- `enter`: deposita exactamente el stake desde la wallet firmante, guarda wallet, `pick_commitment` y evita entradas duplicadas.
- `lock`: impide nuevas entradas o cambios al alcanzar el cierre.
- `settle`: registra el compromiso del snapshot de resultados, la raíz o manifiesto de premios y el total distribuible. Solo puede ejecutarse una vez y después de estar bloqueado.
- `claim`: modelo pull; cada ganador reclama su premio con prueba verificable y una cuenta de claim que impida doble cobro.
- `cancel_and_refund` / `refund`: habilita devolución individual si la jornada se cancela, no hay partidos puntuables o se supera un timeout de seguridad sin liquidación.
- `close`: solo cuando todos los fondos y rentas recuperables estén correctamente tratados.

Invariantes mínimos del programa:

- El programa nunca puede transferir más de lo depositado.
- El mint, token program, stake, cierre y seeds deben comprobarse on-chain.
- No existe una instrucción administrativa de retiro arbitrario.
- No se aceptan entradas después del cierre según el reloj on-chain.
- Depositar, liquidar, reclamar y reembolsar son idempotentes o rechazan claramente el replay.
- Los totales de participantes, pozo, premios, claims y refunds siempre cuadran.
- Usa checked arithmetic y límites explícitos.
- El upgrade authority y settlement authority no deben ser una clave privada guardada en el repositorio ni una variable pública. Diseña para multisig o signer externo seguro antes de Mainnet.

Si utilizas Anchor u otro framework, comprueba primero su versión actual, compatibilidad con la toolchain Solana y recomendaciones oficiales. No elijas una versión por memoria.

### Oracle y confianza

Los resultados deportivos y la puntuación permanecen off-chain en Winscore/Supabase. El programa protege la custodia, pero la aplicación actúa como oracle autorizado para liquidar. Haz explícito este modelo de confianza en la documentación y la UI; no lo presentes como una apuesta totalmente trustless.

Al liquidar una jornada:

1. Comprueba que todos sus partidos estén `final` o `cancelled` y que no falte ningún resultado necesario.
2. Calcula los puntos desde los snapshots inmutables con la fórmula canónica.
3. Construye un manifiesto determinista con jornada, partidos, resultados, participantes, commitments, desglose de puntos, desempates, ganadores y premios en unidades base.
4. Calcula un hash del manifiesto y una estructura verificable de claims, preferiblemente una raíz Merkle para no depender del límite de cuentas por transacción.
5. Persiste el manifiesto de forma auditable y registra su hash on-chain al liquidar.
6. Publica en la UI el desglose, la firma de la transacción y enlaces al explorer de la red correcta.

No liquides automáticamente un resultado recién importado sin un período de seguridad configurable para correcciones. Si un resultado cambia antes de la liquidación, recalcula. Después de una liquidación on-chain no pretendas “editar” la cadena: define un proceso operativo de incidentes y deja claro que requiere intervención extraordinaria.

## Vinculación segura de wallets

La conexión de Wallet Standard solo descubre una dirección; no demuestra por sí sola que el usuario de Supabase la controle. Implementa un flujo de challenge-response:

1. Un Route Handler o Server Action autenticado emite un nonce aleatorio de un solo uso, con dominio, usuario, dirección, cluster, issued-at y expiración corta.
2. La wallet firma un mensaje legible que contiene esos campos.
3. El servidor verifica bytes exactos, firma Ed25519, nonce, expiración, dominio, cluster y usuario.
4. Guarda la vinculación únicamente después de verificarla.
5. El nonce se consume atómicamente y no puede repetirse.

Una dirección solo puede estar vinculada a una cuenta activa a la vez. Permite desvincularla si no tiene una operación pendiente que lo impida. Nunca solicites, transmitas, registres ni almacenes seed phrases o claves privadas. No registres mensajes firmados completos si contienen datos innecesarios.

## Saga entre Postgres y Solana

No existe una transacción atómica entre Supabase y Solana. Modela el flujo como una saga durable e idempotente:

1. Guarda los pronósticos gratuitos mediante la ruta normal.
2. Si el usuario activó la apuesta, crea un `wager_intent` con UUID/idempotency key, expiración, usuario, wallet, pool, jornada, stake, mint y `pick_commitment`.
3. Construye la transacción de entrada a partir de datos confiables del servidor/programa; el cliente solo firma.
4. Envía la transacción y muestra estados `preparing`, `awaiting_signature`, `submitted`, `confirmed` o `failed` sin declarar éxito prematuramente.
5. El servidor no debe confiar en una firma de transacción aportada por el cliente. Consulta RPC y valida cluster, estado de confirmación, programa, instrucción, PDA, wallet firmante, mint, importe, commitment e idempotency key antes de marcar la entrada confirmada.
6. Comprueba además que la cuenta `Entry` esperada exista y contenga los valores correctos.
7. Añade un reconciliador reintentable para transacciones confirmadas cuyo callback se perdió y para intents vencidos o huérfanos.
8. Reintentar nunca puede cobrar dos veces. Si la cuenta on-chain ya existe, reconcilia en vez de volver a transferir.

Usa un proveedor RPC dedicado y configurable en producción; los endpoints públicos oficiales tienen rate limits y no están pensados para aplicaciones de producción. Separa variables públicas y secretos. Valida todas las variables en `lib/env.ts` sin romper `next build`.

## Modelo de datos orientativo

Define el modelo final en una propuesta OpenSpec antes de implementarlo. Como mínimo, cubre entidades equivalentes a:

- `competition_rounds`
- `group_wager_configs`
- `wager_rounds`
- `wallet_link_challenges`
- `wallet_links`
- `wager_intents`
- `wager_entries`
- `wager_entry_predictions`
- `wager_settlements`
- `wager_claims`
- `wager_chain_events` o un ledger de reconciliación equivalente

Guarda direcciones y firmas en su representación canónica, importes como enteros/`numeric` capaces de representar `u64`, cluster y program version explícitos, y estados mediante checks o enums bien migrables. Añade constraints únicos para identidad on-chain, idempotencia y una sola entrada por usuario/pool/jornada.

Cada tabla expuesta debe tener RLS activado y políticas mínimas según propietario, miembro del pool o administrador. Las vistas expuestas deben usar `security_invoker = true` cuando corresponda. Las funciones privilegiadas deben tener `search_path` fijo, permisos revocados por defecto y grants explícitos. No expongas `service_role` al navegador y no uses metadata editable por el usuario para autorización.

Crea las migraciones con el CLI de Supabase después de consultar `supabase --help`; no inventes nombres manualmente. Prueba primero de forma local, ejecuta los tests SQL/RLS y revisa advisors antes de considerar una migración lista. No apliques nada a Supabase remoto sin autorización expresa.

## Experiencia de usuario

Añade una vista de “Quiniela de la jornada” que agrupe los partidos de una jornada y permita enviarlos de forma cómoda. Integra ahí la opción de apuesta, no en cada tarjeta de partido de forma aislada.

El flujo debe mostrar:

- Jornada, liga y pool.
- Lista completa de partidos y estado de cada pronóstico.
- Hora exacta de cierre en la zona local del usuario.
- Switch opcional desactivado por defecto.
- Token, stake fijo, pozo confirmado, participantes confirmados y comisión de red estimada.
- Wallet conectada y cluster visible; Devnet debe tener un badge imposible de confundir con Mainnet.
- Resumen final antes de firmar, explicando que la firma mueve tokens.
- Estado durable de la transacción, firma y enlace al explorer.
- Explicación de que la apuesta usa un snapshot inmutable mientras los pronósticos gratuitos pueden seguir editándose según las reglas normales.
- Tabla de jornada con puntos, desempates, participantes apostados y estado de claim/refund.
- Acciones de “Reclamar premio” o “Solicitar reembolso” cuando proceda.
- Estados accesibles de carga, wallet ausente, firma rechazada, saldo insuficiente, token account inexistente, blockhash vencido, RPC no disponible, transacción fallida, confirmación demorada, cierre alcanzado y reconciliación pendiente.

No uses mensajes engañosos como “apuesta confirmada” hasta comprobarla on-chain. No muestres el saldo optimista como definitivo. Mantén navegación por teclado, labels, foco, contraste, reduced motion y diseño responsive.

## Legal, seguridad y operación

Las apuestas con valor real son una actividad regulada. No concluyas que la funcionalidad es legal ni la actives globalmente. Incluye:

- Feature flags separadas para UI, creación de escrows, depósitos y liquidación.
- Devnet como valor por defecto y un bloqueo explícito que impida Mainnet accidental.
- Pantalla de aceptación de reglas, riesgos, irreversibilidad, modelo de oracle y términos.
- Ganchos configurables para edad, país/territorio, geofencing, autoexclusión y límites, pendientes de definición por asesoría legal.
- Kill switch que impida nuevas apuestas sin bloquear claims o refunds existentes.
- Límites de stake y rate limiting server-side/on-chain.
- Registro de auditoría sin secretos ni datos personales innecesarios.
- Runbook para RPC caído, transacciones huérfanas, jornada cancelada, resultado corregido, settlement atrasado, autoridad comprometida y pausa de emergencia.

Antes de cualquier Mainnet: revisión legal por jurisdicción, threat model, auditoría externa del programa, pruebas económicas, multisig, monitorización, política de upgrade/pausa y simulacro de recuperación. Trátalo como criterio de bloqueo, no como una nota opcional.

## Observabilidad

Instrumenta métricas y logs estructurados correlacionados por `wager_intent_id`, firma, pool y jornada, sin claves ni payloads sensibles:

- intents creados/expirados
- firmas rechazadas
- depósitos enviados/confirmados/fallidos
- latencia y errores RPC
- discrepancias Postgres/on-chain
- jornadas bloqueadas/liquidadas/canceladas
- claims/refunds exitosos o fallidos
- fondos no reclamados y antigüedad

Incluye una vista administrativa de solo lectura para reconciliación y alertas. Las acciones sensibles requieren reautenticación/autorización real en el servidor; ocultar botones no es una barrera de seguridad.

## Pruebas obligatorias

Añade pruebas proporcionales al riesgo:

- Unitarias para scoring base, multiplicadores, agregación de jornada, desempates, empate múltiple y residuo.
- Paridad entre la primitiva SQL y `lib/scoring.ts` con casos generados y límites.
- SQL/RLS para acceso entre usuarios, pools y ligas; intent replay; unique constraints; carrera contra el cierre.
- Programa Solana: cada instrucción, autoridad, seeds, mint incorrecto, importe incorrecto, doble entrada, entrada tardía, doble settlement, premio inválido, doble claim, refund, overflow y conservación del total del pozo.
- Integración local validator y Devnet para depósito, confirmación, reconciliación, settlement, claim y refund.
- Saga: firma rechazada, callback perdido, RPC 429/timeout, blockhash vencido, transacción caída, reintento y confirmación tardía.
- E2E del camino gratuito sin wallet y del camino apostado con wallet.
- Accesibilidad e i18n en `en`, `es`, `fr` y `de`.
- Regresión de los tests existentes, especialmente scoring, kickoff lock, grupos y aislamiento por liga.

Al finalizar ejecuta y reporta, como mínimo:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ejecuta también los tests SQL de Supabase y los tests del programa Solana con los comandos descubiertos en las toolchains instaladas. No afirmes que algo fue verificado si no se ejecutó; informa claramente cualquier bloqueo externo.

## Secuencia de trabajo y entregables

1. Inspecciona el repositorio y la documentación oficial vigente.
2. Crea un cambio OpenSpec llamado `solana-matchday-wagers` con `proposal.md`, `design.md`, especificaciones y `tasks.md`. Incluye diagrama de estados, threat model, modelo de confianza y plan de rollback.
3. Presenta las decisiones y supuestos que no puedan deducirse del repositorio antes de tomar una decisión irreversible. No detengas el trabajo por detalles menores razonablemente resolubles.
4. Implementa en incrementos seguros: jornadas, quiniela agrupada gratuita, wallet linking, ledger/saga, programa Devnet, depósito, reconciliación, scoring/settlement, claims/refunds y administración.
5. Mantén las migraciones aditivas y compatibles. No rompas pools ni pronósticos existentes.
6. Actualiza documentación de arquitectura, modelo de datos, variables de entorno, operación y seguridad.
7. Entrega un resumen de archivos cambiados, migraciones, programa/IDL, nuevas variables, decisiones de seguridad, pruebas ejecutadas y limitaciones conocidas.

## Criterios de aceptación

La tarea solo está completa cuando se demuestre que:

- Un usuario puede seguir enviando una quiniela gratuita sin wallet y sin ver errores de Solana.
- Un dueño puede habilitar apuestas opcionales con stake y token válidos para su pool, sin afectar otros pools o ligas.
- Un miembro puede apostar en una jornada y omitir la siguiente.
- La entrada se rechaza tanto en servidor como on-chain después del cierre.
- El snapshot de pronósticos apostados es inmutable y su hash coincide con el compromiso on-chain.
- El pozo solo contiene depósitos confirmados y no puede cobrarse dos veces.
- La clasificación apostada usa exactamente la puntuación/multiplicadores existentes y desempates canónicos.
- Los ganadores pueden reclamar el total del pozo conforme al manifiesto; los casos cancelados pueden reembolsarse.
- Un callback perdido o un retry no duplica depósitos, entradas, settlements, claims ni refunds.
- RLS impide leer o mutar datos privados de otro usuario/pool.
- Devnet está claramente identificado y Mainnet permanece bloqueado por defecto.
- Los cuatro idiomas, accesibilidad, responsive, tests, typecheck, lint y build quedan verificados.

No simplifiques custodia, idempotencia, cierre, vinculación de wallet, RLS, reconciliación o reembolsos para acelerar la entrega. Si el alcance completo no cabe en una sola iteración, deja una primera fase funcional en Devnet con todos los invariantes de seguridad y una lista explícita de trabajo pendiente; nunca simules seguridad con estados exclusivos de la UI.
