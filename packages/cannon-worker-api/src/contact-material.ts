import type { ContactMaterialOptions, MaterialOptions } from 'cannon-es'

export class ContactMaterial {
  static idCounter = 0

  id: string
  materialA: MaterialOptions
  materialB: MaterialOptions
  options: ContactMaterialOptions

  constructor(materialA: MaterialOptions, materialB: MaterialOptions, options: ContactMaterialOptions) {
    this.materialA = materialA
    this.materialB = materialB
    this.options = options
    this.id = String(ContactMaterial.idCounter++)
  }
}
