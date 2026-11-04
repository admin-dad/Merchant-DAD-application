export const PRODUCT_AUDIENCES = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'kids', label: 'Kids' },
  { value: 'boys', label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'babies', label: 'Babies' },
  { value: 'other', label: 'Other' },
] as const

export function productAudienceLabel(value?: string | null) {
  return PRODUCT_AUDIENCES.find(option => option.value === value)?.label ?? 'Other'
}
