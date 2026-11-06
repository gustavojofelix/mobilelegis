# Mobilelegis — Protótipo (Angular 22)

Protótipo navegável da Mobilelegis com dados fictícios em JSON, em PT, EN e FR, pensado primeiro para telemóvel.

## Executar

```bash
npm install
npm start          # http://localhost:4200
```

Conta de demonstração (pré-preenchida no login): `claudio.nelasi@gmail.com` / `1234`

## Funcionalidades

| Área | O que demonstra |
|---|---|
| Login / Registo | Registo com escolha de áreas para o teste de 14 dias |
| Trial | Contagem de dias, bloqueio automático; em Conta pode simular o fim do teste |
| Legislação | Área → Categoria → Subcategoria → Diploma |
| Pesquisa | Palavras-chave no texto completo + título, ano, tipo, número, estado |
| Diploma | Texto por **artigos** (sem paginação); pesquisa interna com **navegação contínua entre todas as ocorrências**, lista de resultados com artigo, zoom, anotações, notas de alteração, redacção anterior, anexos, download com marca d'água |
| Compra avulsa | Funciona mesmo com conta bloqueada; vouchers |
| Subscrições | Básico (até 5 áreas) / Ilimitado; ciclos 1, 3, 6, 12 meses; vouchers |
| Pagamentos | M-Pesa, E-Mola, mKesh (simulação PaySuite + fatura OfficeGest) |
| Conta | Perfil, validade, dispositivos, histórico, eliminação de conta |
| Assistente IA | **Simulado**: pesquisa por palavras-chave e responde citando diploma e artigo |
| Back Office | Proposta do fluxo com IA: upload PDF → OCR → operações de consolidação → validação humana → publicação |

Vouchers de teste: `LEGIS10` (10%), `ESTUDANTE25` (25%, só planos), `BEMVINDO` (−200 MZN).

## Estrutura

```
public/data/     areas.json, diplomas.json, users.json, plans.json, ingestion.json
public/i18n/     pt.json, en.json, fr.json
src/app/core/    modelos, DataService, AuthService (back end simulado), i18n, utilitários de texto
src/app/pages/   uma página por rota
src/app/shared/  modal de pagamento, cartão de diploma, selector de língua
```

O estado (compras, subscrições, anotações) é guardado no `localStorage`. "Repor dados de demonstração" em Conta volta ao estado inicial.
Para ligar a uma API real, substitui-se `DataService` e `AuthService` por chamadas HTTP, sem alterar as páginas.

> Os textos legais são simplificados/fictícios e servem apenas para demonstração.
