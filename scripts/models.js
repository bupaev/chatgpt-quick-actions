const models = [
  {
    title: "GPT-5.4 Pro ($30.0 in, $180.0 out)",
    value: "gpt-5.4-pro",
  },
  {
    title: "GPT-5.4 ($2.5 in, $15.0 out)",
    value: "gpt-5.4",
  },
  {
    title: "GPT-5 ($1.25 in, $10.0 out)",
    value: "gpt-5",
  },
  {
    title: "GPT-5 Mini ($0.25 in, $2.0 out)",
    value: "gpt-5-mini",
  },
  {
    title: "GPT-5 Nano ($0.05 in, $0.4 out)",
    value: "gpt-5-nano",
  },
  {
    title: "o3 ($2.5 in, $15.0 out)",
    value: "o3",
  },
  {
    title: "o1-pro ($15.0 in, $120.0 out)",
    value: "o1-pro",
  },
  {
    title: "o1 ($1.25 in, $10.0 out)",
    value: "o1",
  },
  {
    title: "GPT-4.1 ($3.0 in, $12.0 out)",
    value: "gpt-4.1",
  },
  {
    title: "GPT-4.1 Mini ($0.8 in, $3.2 out)",
    value: "gpt-4.1-mini",
  },
  {
    title: "GPT-4.1 Nano ($0.2 in, $0.8 out)",
    value: "gpt-4.1-nano",
  },
];

const commandModels = [
  {
    title: "Follow global model",
    value: "global"
  },
  ...models
];

module.exports = {
  models,
  commandModels
}; 
