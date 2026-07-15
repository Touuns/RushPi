# Pi Network technical learning profile

Status: evidence-bounded educational profile

Last reviewed: 2026-07-15

## Executive boundary

Rush Pi can accurately teach current Pi developer-platform flows and Open Network status from reviewed official sources. It can teach SCP/FBA, quorum, and social-trust ideas only as historical or simplified concepts where the original whitepaper is the evidence. It cannot claim to simulate current Pi consensus, node selection, finality, rewards, or security-circle behavior from the reviewed public material.

## Evidence layers

### Current official

Open Network launched in February 2025 and enables external connectivity (`pi-open-network-launch`). Pi provides a developer platform for Pi Browser apps (`pi-developers`). The SDK currently documents initialization, authentication, and user-to-app payment creation (`pi-sdk-core`). The Platform API documents server-side user and payment operations, including app-to-user lifecycles (`pi-platform-api`).

### Historical official

The original whitepaper describes a consensus lineage based on Stellar Consensus Protocol / Federated Byzantine Agreement and discusses social-trust/security-circle concepts (`pi-whitepaper-original`). The source itself warns that original sections may not be fully current.

### Proposed design

Pi Lab may model client/server authentication boundaries, fictional payment-state machines, evidence classification, and historical quorum graphs. These are Rush Pi teaching designs, not Pi product functions.

### Needs verification

The reviewed material is insufficient for current claims about:

- consensus message phases and exact protocol version;
- live quorum-set construction and thresholds;
- node admission, selection, or weighting;
- current finality guarantees and timing;
- the operational role of security circles after Open Network launch;
- any direct relationship between daily app participation and block validation;
- current reward calculation or relationship to node consensus.

Until a current official technical specification answers them, player-facing content must either omit these details or show “needs current verification.”

## Ecosystem components

### Pi ecosystem

The reviewed current sources establish a platform in which users access apps through Pi Browser and apps integrate authentication or payment workflows. “Ecosystem utility” should mean an app function delivered through documented platform interfaces, not a claim about token value, investment prospects, adoption, or future availability.

### Pi Browser

Pi Browser is the supported app context described by current SDK documentation. A Lab diagram may show it as the client container. It must not be presented as a blockchain node, consensus participant, wallet secret store, or backend trust boundary.

### Pi SDK

The SDK initializes in the supported client environment and exposes documented authentication and payment entry points. Client code is inspectable, so privileged server credentials do not belong there. A successful client callback is application state, not independent evidence of consensus finality.

### Authentication

Authentication establishes an app user context and approved information scope. It is separate from signing a blockchain transaction, operating a node, performing KYC, or participating in consensus. Lessons use fictional user IDs and request minimal scopes.

### Wallet and payment experience

The current developer surface supports documented user-to-app and app-to-user workflows. The safe teaching model is a state machine:

`draft → user review or server approval → platform submission → server verification → completion or cancellation`

The exact lifecycle differs by direction and API. The backend is responsible for documented verification and completion operations. The Lab performs none of these calls and stores no credentials.

### Testnet, Mainnet, and Open Network

Testnet and Mainnet are distinct execution contexts. Older developer material discussing Enclosed and Open phases is useful historically, but the newer official announcement establishes that Open Network launched. UI must therefore avoid presenting “Open Network” as a future state.

## Blockchain and node concepts

“Pi blockchain” names the network layer whose current low-level public specification is not fully captured by the reviewed developer API pages. “Pi Node” names infrastructure software or participants, not every mobile app session. The learning architecture keeps Browser, app, wallet/payment, backend, node, and consensus as separate boxes.

The original whitepaper's SCP/FBA relationship supports these historical concepts:

- each federated node has local trust requirements;
- a quorum slice is sufficient for one node under its configuration;
- network quorums emerge from combinations of local slices;
- safe configurations require suitable overlap;
- trust edges represent protocol dependencies, not friendship or social endorsement.

The Pi Lab borrows Stellar's current official SCP documentation to explain the general concepts, but never assumes Stellar and current Pi implementations are identical.

## Participation and validation

The following separation is mandatory:

| Concept | Meaning in this profile | Must not be called |
|---|---|---|
| Mobile app participation | A user-facing app action under Pi product policy. | Block validation, proof of work, or consensus vote. |
| Rewards | A policy/economic accounting concept requiring current official evidence. | Guaranteed income, value, yield, or validation proof. |
| Wallet/payment | User-reviewed authorization and platform payment lifecycle. | Node operation or consensus. |
| Node | Infrastructure participating in network functions under protocol rules. | Every phone session. |
| Consensus validation | Protocol verification and agreement among relevant network participants. | Daily tap or authentication callback. |

The sentence “tapping each day directly validates blocks” is prohibited.

## Security and privacy notes

- Never collect a private key, seed phrase, real wallet address, payment identifier, or access token for a lesson.
- Keep server credentials and payment completion authority outside clients.
- Use fictional users and abstract units.
- Authentication is not KYC; a platform user ID is not proof of real-world identity.
- A trust graph can expose sensitive relationships; all graphs are invented.
- No current node or network topology is loaded into the Lab.

## Release review

Before shipping a Pi-specific lesson, reviewers must confirm the claim status, source date, exact wording, simplification disclosure, and trademark boundary. A newer current specification supersedes this profile only after explicit source-catalog and content review.
