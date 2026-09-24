export interface Ad {
  id: string
  title: string
  image_url: string
  image_url_mobile: string | null
  link_url: string | null
  is_active: boolean
  sort_order: number
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}
