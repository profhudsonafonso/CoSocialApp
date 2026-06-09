export interface ProjectColabScoreSettings {
  reference_hourly_value?: number | string | null
  default_validated_hours?: number | string | null
  default_delivery_factor?: number | string | null
  default_impact_factor?: number | string | null
  default_risk_factor?: number | string | null
  min_points?: number | string | null
  max_points?: number | string | null
}

// TODO: Later parse GitHub labels such as hours:4, risk:high, impact:medium, delivery:fast to prefill issue ColabScore settings.
// TODO: Later add templates such as simple, balanced, high-risk/high-reward.
// TODO: Later add authentication so only the project owner can edit settings.

export interface IssueColabScoreSettings {
  validated_hours?: number | string | null
  delivery_factor?: number | string | null
  impact_factor?: number | string | null
  risk_factor?: number | string | null
  manual_points?: number | string | null
}

export interface EffectiveColabScoreConfig {
  referenceHourlyValue: number
  validatedHours: number
  deliveryFactor: number
  impactFactor: number
  riskFactor: number
  minPoints: number
  maxPoints: number
  manualPoints: number | null
}

export interface CalculateColabScoreInput extends EffectiveColabScoreConfig {}

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

function toOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

export function clampPoints(points: number, minPoints: number, maxPoints: number) {
  return Math.max(minPoints, Math.min(maxPoints, points))
}

export function getEffectiveColabScoreConfig(
  projectSettings?: ProjectColabScoreSettings | null,
  issueSettings?: IssueColabScoreSettings | null,
): EffectiveColabScoreConfig {
  const minPoints = Math.round(toNumber(projectSettings?.min_points, 1))
  const maxPoints = Math.round(toNumber(projectSettings?.max_points, 1000))

  return {
    referenceHourlyValue: toNumber(projectSettings?.reference_hourly_value, 50),
    validatedHours: toOptionalNumber(issueSettings?.validated_hours)
      ?? toNumber(projectSettings?.default_validated_hours, 1),
    deliveryFactor: toOptionalNumber(issueSettings?.delivery_factor)
      ?? toNumber(projectSettings?.default_delivery_factor, 1),
    impactFactor: toOptionalNumber(issueSettings?.impact_factor)
      ?? toNumber(projectSettings?.default_impact_factor, 1),
    riskFactor: toOptionalNumber(issueSettings?.risk_factor)
      ?? toNumber(projectSettings?.default_risk_factor, 1),
    minPoints,
    maxPoints: Math.max(minPoints, maxPoints),
    manualPoints: toOptionalNumber(issueSettings?.manual_points),
  }
}

export function calculateColabScore(input: CalculateColabScoreInput) {
  if (input.manualPoints !== null && input.manualPoints !== undefined) {
    return clampPoints(Math.round(input.manualPoints), input.minPoints, input.maxPoints)
  }

  const points = Math.round(
    input.validatedHours *
    input.referenceHourlyValue *
    input.deliveryFactor *
    input.impactFactor *
    input.riskFactor,
  )

  return clampPoints(points, input.minPoints, input.maxPoints)
}
