# 🚛 RM Frotas Web — Enterprise Fleet Management UI

<div align="center">

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

Interface moderna, reativa e profissional para gestão executiva e operacional de frotas veiculares, motoristas, viagens e manutenções.

[Visão Geral](#-visão-geral) •
[Funcionalidades](#-funcionalidades-chave) •
[Arquitetura](#-arquitetura-do-frontend) •
[Design System](#-design-system--ux) •
[Instalação & Execução](#-instalação-e-execução) •
[Deploy](#-deploy-vercel)

</div>

---

## 📌 Visão Geral

O **RM Frotas Web** é o frontend corporativo da plataforma RM Frotas. Construído sobre **Angular Standalone Components**, **Signals** e **Tailwind CSS**, o sistema oferece uma experiência de usuário (UX) fluida, rápida e responsiva, eliminando ruídos visuais com feedback instantâneo, microinterações e proteção de integridade em formulários.

A interface foi projetada para dois perfis principais de operação:
1. **Gestores de Frota (`FLEET_MANAGER` / `ADMIN`)**: Painel executivo de indicadores, controle total de veículos, motoristas, agendamento de viagens e gestão de acessos.
2. **Motoristas (`DRIVER`)**: Visão de autoatendimento (*self-service*) de suas viagens e status de documentação.

---

## ✨ Funcionalidades Chave

### 📊 Dashboard Executivo & KPIs
- Indicadores consolidados em tempo real: total de veículos, veículos em trânsito, motoristas ativos e viagens concluídas.
- Gráficos analíticos interativos via **Chart.js** (distribuição por status, manutenções preventivas e evolução de quilometragem).
- Atividades recentes e alertas de vencimento de CRLV/CNH.

### 🚗 Gestão Operacional de Frota
- **Veículos**: Tabela paginada com status dinâmicos (*Disponível*, *Em Viagem*, *Em Manutenção*, *Inativo*), controle de quilometragem e data de licenciamento (CRLV).
- **Motoristas**: Cadastro de condutores com validação de CNH, categoria e controle de pontuação/vencimento.
- **Viagens / Despacho**: Registro de saídas, chegadas, hodômetro inicial/final e alocação de motorista/veículo.
- **Usuários & Permissões**: Painel administrativo para gestão de papéis (`ADMIN`, `FLEET_MANAGER`, `DRIVER`).

### ⚡ Produtividade & UX Avançada
- **Command Palette Global (`Ctrl + K` / `Cmd + K`)**: Atalho de navegação rápida para qualquer módulo, atalhos de novo cadastro ou busca rápida.
- **Central de Notificações & Feedback**: Toasts flutuantes com temporizador e dropdown de alertas com badges de status.
- **Máscaras de Entrada Inteligentes (Directives Standalone)**:
  - `[appPlateMask]`: Formatação e conversão automática para padrão Mercosul (`ABC-1D23` ou `ABC-1234`) com uppercase forçado.
  - `[appCpfMask]`: Formatação dinâmica para CPF (`000.000.000-00`).
  - `[appPhoneMask]`: Máscara flexível para fixo e celular (`(00) 00000-0000`).
  - `[appCnhMask]`: Controle numérico com limite de 11 dígitos.
- **Skeleton Screens**: Feedback visual de carregamento suave em tabelas e cards, evitando saltos de layout (*Layout Shift*).
- **Modais Glassmorphism**: Diálogos com `backdrop-blur-md`, foco automático e confirmações de ações críticas.

---

## 🏛 Arquitetura do Frontend

O projeto adota princípios de **Clean Architecture** adaptados ao ecossistema moderno do Angular:

```
src/app/
├── application/           # Casos de uso e orquestração de fluxos
│   ├── auth/              # Casos de uso de autenticação (Login, Logout)
│   └── fleet/             # Casos de uso de negócios (Veículos, Motoristas, Viagens)
│
├── core/                  # Serviços singleton, adapters HTTP e infraestrutura
│   ├── adapters/          # Implementações concretas de repositórios HTTP
│   ├── guards/            # AuthGuard e GuestGuard
│   ├── interceptors/      # AuthInterceptor (Bearer token) e ErrorInterceptor
│   └── services/          # AuthStateService (Signals), ToastService
│
├── domain/                # Modelos de domínio puros e interfaces de repositório
│   ├── models/            # Entidades (Vehicle, Driver, Trip, User, Dashboard)
│   └── repositories/      # Contratos de repositório (ex: IVehicleRepository)
│
└── presentation/          # Camada de apresentação e interface com o usuário
    ├── auth/              # Telas de Login e Recuperação de Senha
    ├── dashboard/         # Visão consolidada de KPIs e gráficos
    ├── fleet/             # Módulos de Veículos, Motoristas e Viagens
    └── shared/            # Componentes reutilizáveis, modais, diretivas e layout
        ├── components/    # Skeletons, Modais, Toasts, Dropdowns
        ├── directives/    # Máscaras de input (CPF, Placa, Telefone, CNH)
        └── layouts/       # MainLayout (Sidebar, Header com Command Palette)
```

### Destaques Técnicos:
- **Angular Standalone APIs**: Sem `NgModule`, melhor *tree-shaking* e inicialização mais rápida.
- **Angular Signals**: Gerenciamento de estado reativo e granular para autenticação, filtros e listagens.
- **DIP (Dependency Inversion Principle)**: Componentes consom abstrações de repositórios via tokens de injeção de dependência (`VEHICLE_REPOSITORY_TOKEN`).

---

## 🎨 Design System & UX

- **Cores & Tema**: Paleta Slate/Indigo moderna, com contrastes acessíveis (WCAG AA).
- **Tipografia**: Inter font family com hierarquia clara e legível.
- **Ícones**: `@lucide/angular` para consistência e clareza semântica.
- **Microinterações**: Animações suaves em hover, transições de abertura de modais e dropdowns.

---

## 🚀 Instalação e Execução

### Pré-requisitos
- **Node.js**: `v20.x` ou superior
- **npm**: `v10.x` ou superior

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/rm-frotas-web.git
   cd rm-frotas-web
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Edite `src/environments/environment.ts` conforme a URL da sua API backend:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/v1'
   };
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   # ou
   ng serve
   ```
   Acesse a aplicação em `http://localhost:4200/`.

---

## 🧪 Testes Automatizados & Qualidade

```bash
# Executar a suíte de testes unitários com Vitest
npm test

# Executar testes em modo watch (desenvolvimento contínuo)
npx vitest

# Executar build de verificação
npm run build
```

---

## 🌐 Deploy (Vercel)

O projeto está totalmente configurado para deploy automático na **Vercel** com suporte a Single Page Application (SPA Routing):

### Configuração (`vercel.json`)
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/rm-frotas-web/browser",
  "framework": "angular",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Passos para Deploy:
1. Conecte o repositório na plataforma [Vercel](https://vercel.com/).
2. A Vercel detectará automaticamente as configurações do `vercel.json`.
3. Configure a variável de ambiente se necessário e clique em **Deploy**.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja `LICENSE` para mais informações.
