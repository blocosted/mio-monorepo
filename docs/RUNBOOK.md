# Runbook (génération d’histoires)

Ce runbook décrit les procédures d’exploitation liées au workflow **LLM enrichment → script**.

## Vérifications avant déploiement

- **Variables d’environnement**: voir `docs/ENV.md`
  - LLM: `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` (selon provider)
  - Sélection: `LLM_PROVIDER`
- **Build**:

```bash
bun run build
```

## Smoke test “génération” (recommandé après déploiement)

Objectif: valider le chemin critique “enrich → generate-script” avec un prompt simple.

```bash
nx run scripts:llm -- enrich-story --prompt "A child finds a mysterious door in a tree." --profile emilie
```

Puis:

```bash
nx run scripts:llm -- generate-script --enrichInputFile "<artifactsDir>/input.json" --provider openai --targetDurationMinutes 5
```

Critères de réussite:
- `output.json` existe
- `validation.isValid = true`
- `validation.wordCount` proche de la cible
- `attempts` raisonnable (souvent 1–2)

## Monitoring (signaux utiles)

Surveiller:
- **Taux d’échec JSON**: erreurs de parsing (réponse LLM non-JSON).
- **Taux d’échec de validation**: scripts trop courts (word count), manque de segments, timeline incohérente.
- **Latence**: timeouts provider.
- **Coût**: inflation du word budget (surtout OpenAI).

## Incidents fréquents & remédiations

### 1) Réponse LLM invalide (non-JSON)

Symptômes:
- erreur de type `LLMInvalidJSON` / “missing tracks/metadata/characters”

Actions:
- Rejouer avec `--dryRun` pour vérifier les prompts (format JSON strict).
- Réduire la température.
- Augmenter le timeout si nécessaire.
- Vérifier si le provider renvoie des “préambules” (texte avant/après le JSON).

### 2) Scripts trop courts (word count trop bas)

Symptômes:
- `validation.errors` contient “Word count too low …”

Actions:
- Vérifier `targetDurationMinutes` et le budget calculé dans `prompts.json`.
- Ajuster le prompt “CRITICAL WARNING” (exiger plus de contenu par segment).
- Ajuster la stratégie d’inflation (OpenAI sous-génère souvent).

### 3) Timeouts / rate limiting

Symptômes:
- erreurs réseau, 429, timeouts

Actions:
- Augmenter `--timeout` pour la CLI.
- Réduire `--maxTokens` si le modèle le supporte.
- Mettre en place un backoff/retry provider-side (si nécessaire).

### 4) Validation timeline (overlap piste voix)

Symptômes:
- `validation.errors` mentionne “Timeline overlap …”

Actions:
- Renforcer les règles “Voice segments are sequential” dans le prompt.
- Vérifier que `startTime` et `duration` progressent strictement sur la piste voix.

## Rollback (sécurité)

Si une modification de prompt dégrade la génération:
- Revenir à la version précédente des prompts.
- Rejouer le smoke test “génération”.
- Surveiller la stabilisation du taux de réussite / latence.

