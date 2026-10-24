<div align="center">

<img src="assets/banner.svg" width="100%" alt="Mohammad Malkawi — Computer Networks & Cybersecurity"/>

<a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=20&duration=3000&pause=1200&color=22D3EE&center=true&vCenter=true&width=680&lines=Computer+Networks+%26+Cybersecurity+Student;Designing+and+securing+network+infrastructure;Vice+Chair+%E2%80%94+IEEE+Jadara+Student+Branch;Building+AI+tools+and+real-world+systems" alt="Typing intro"/></a>

<a href="https://malkawi-portfolio.netlify.app/"><img src="https://img.shields.io/badge/Portfolio-0b1626?style=for-the-badge&logo=googlechrome&logoColor=22d3ee" alt="Portfolio"/></a>
<a href="https://linkedin.com/in/mohammad-h-malkawi-3264b5365"><img src="https://img.shields.io/badge/LinkedIn-0b1626?style=for-the-badge&logo=linkedin&logoColor=22d3ee" alt="LinkedIn"/></a>
<a href="mailto:malkawimohammadh@gmail.com"><img src="https://img.shields.io/badge/Email-0b1626?style=for-the-badge&logo=gmail&logoColor=22d3ee" alt="Email"/></a>
<img src="https://img.shields.io/badge/Irbid,_Jordan-0b1626?style=for-the-badge&logo=googlemaps&logoColor=22d3ee" alt="Irbid, Jordan"/>

</div>

<img src="assets/divider.svg" width="100%" alt=""/>

## About me

Hi, I'm **Mohammad** — a third-year Computer Networks & Cybersecurity student at Jadara University in Irbid, Jordan.

I'm interested in how connected systems are built and how they stay safe: how data moves across a network, where that path can be attacked, and how to design infrastructure that holds up. Most of what I build sits where networking meets the physical world, and I lead student engineering programs as Vice Chair of the IEEE Jadara Student Branch.

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>🌐 Networking</h4>
      Designing reliable networks and understanding the protocols that keep systems talking to each other.
    </td>
    <td width="33%" valign="top">
      <h4>🔐 Security</h4>
      Learning how systems are attacked so I can defend them — traffic analysis, hardening, and data you can trust.
    </td>
    <td width="33%" valign="top">
      <h4>🤖 Systems & AI</h4>
      Bringing AI into real systems, from traffic signals to lab rigs and creative tools.
    </td>
  </tr>
</table>

> **Currently open to** networking & cybersecurity internships, remote or in Jordan.

<img src="assets/divider.svg" width="100%" alt=""/>

## Featured projects

### 🎬 [After Effects MCP Pro](https://github.com/malkawi06/After-Effects-mcp-pro) — Claude as a motion designer

Most After Effects connectors give an AI a few fixed commands and no way to see what it made. **After Effects MCP Pro** is an open-source MCP server that lets Claude build any scriptable scene in Adobe After Effects, watch its own frames, check timing against the music, fix what fails and render in the background.

| | |
|:--|:--|
| **How it works** | A CEP panel inside After Effects listens only on `127.0.0.1` behind a secret token. The MCP server exposes **14 tools**: inspect, run ExtendScript with a motion library, preview, review with automatic checks and a beat-sync score, render, voice-over, music and fonts. Checkpoints, a read-only switch and per-call logging keep it safe. **53 automated checks**, MIT licensed. |
| **Built with** | ![MCP](https://img.shields.io/badge/MCP-0b1626?style=flat-square) ![Node.js](https://img.shields.io/badge/Node.js-0b1626?style=flat-square&logo=nodedotjs&logoColor=22d3ee) ![ExtendScript](https://img.shields.io/badge/ExtendScript-0b1626?style=flat-square&logo=adobeaftereffects&logoColor=22d3ee) ![CEP](https://img.shields.io/badge/CEP_panel-0b1626?style=flat-square) |

### 🌱 [C-Layer](https://malkawi-portfolio.netlify.app/projects/c-layer.html) — Test rig for CO₂-capture materials

Cement makes about 8% of global CO₂, and the materials that capture it wear out in kiln smoke. Plants need to know which one lasts before they invest. **C-Layer** is a bench-top rig that measures each cartridge's capacity under cement-like gas and seals every result in a tamper-evident log.

| | |
|:--|:--|
| **How it works** | 15% CO₂ with ~2% humidity flows through a 2.5 g cartridge until CO₂ breaks through; the curve gives the material's capacity ± error. A six-stage cycle (purge, cool, inlet reading, absorb at 40°C, regenerate at 90–100°C, seal) takes 8–12 minutes per run. Each record is **hash-chained (SHA-256)**, **signed with ECDSA P-256** by a key inside a secure chip, and externally timestamped. |
| **Built with** | ![Raspberry Pi](https://img.shields.io/badge/Raspberry_Pi-0b1626?style=flat-square&logo=raspberrypi&logoColor=22d3ee) ![NDIR](https://img.shields.io/badge/NDIR_CO₂_sensor-0b1626?style=flat-square) ![PID](https://img.shields.io/badge/PID_control-0b1626?style=flat-square) ![SHA-256](https://img.shields.io/badge/SHA--256_hash_chain-0b1626?style=flat-square) ![ECDSA](https://img.shields.io/badge/ECDSA_P--256-0b1626?style=flat-square) |

### 🚦 [SALKA](https://malkawi-portfolio.netlify.app/projects/salka.html) — Adaptive traffic control for Irbid

Most traffic lights in Jordan run on fixed timers, whatever the actual traffic looks like. **SALKA** rebuilds Culture Circle in Irbid as a digital twin and retimes green phases to the real queues, with priority for emergency vehicles. Result: **up to 15% lower average waiting time**, measured in simulation.

| | |
|:--|:--|
| **How it works** | The road network is pulled from **OpenStreetMap** into **SUMO**. A Python controller reads queues, waiting times and occupancy live through **TraCI** and gives congested approaches longer greens. |
| **Built with** | ![Python](https://img.shields.io/badge/Python-0b1626?style=flat-square&logo=python&logoColor=22d3ee) ![SUMO](https://img.shields.io/badge/SUMO-0b1626?style=flat-square) ![TraCI](https://img.shields.io/badge/TraCI-0b1626?style=flat-square) ![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-0b1626?style=flat-square&logo=openstreetmap&logoColor=22d3ee) |

<img src="assets/divider.svg" width="100%" alt=""/>

## Leadership

| Role | Impact |
|:--|:--|
| **Vice Chair** · IEEE Jadara Student Branch | Now. The university's IEEE student branch. |
| **Chair** · IEEE RAS Jadara (2025–2026) | Led the Robotics & Automation Society student chapter and a 7-person team through about 30 workshops and events. |
| **Organizer** · RoboCraft (6 Jan 2026) | A national robotics competition: **110 teams registered**, **~300 participants**, **16 universities**. |
| **Grant** · IEEE RAS | Awarded the **IEEE RAS Chapter Initiative Grant** in 2026 for RoboCraft. |

<img src="assets/divider.svg" width="100%" alt=""/>

## Tech stack

<div align="center">

<img src="https://skillicons.dev/icons?i=linux,kali,bash,python,cpp,js,ts,nodejs,vite,docker,git,github,raspberrypi,arduino&theme=dark" alt="Tech stack"/>

<br/><br/>

![Cisco](https://img.shields.io/badge/Cisco-0b1626?style=for-the-badge&logo=cisco&logoColor=22d3ee)
![Wireshark](https://img.shields.io/badge/Wireshark-0b1626?style=for-the-badge&logo=wireshark&logoColor=22d3ee)
![NVIDIA Jetson](https://img.shields.io/badge/NVIDIA_Jetson-0b1626?style=for-the-badge&logo=nvidia&logoColor=76B900)
![SUMO](https://img.shields.io/badge/SUMO-0b1626?style=for-the-badge)
![MCP](https://img.shields.io/badge/MCP-0b1626?style=for-the-badge)

</div>

<br/>

<img src="assets/footer.svg" width="100%" alt="Thanks for stopping by"/>
