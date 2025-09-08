export class ProductDto {
    idProducto: number;
    idCategoria: string;
    categoria: string;
    idSubCategoria: string;
    subCategoria: string;
    idMarca: string;
    marca: string;
    nombre: string;
    precio: number;
    idColor: string;
    color: string;
    descripcion: string;
    imagen: string;
    destacado: boolean;
    nuevo: boolean;
    masVendido: boolean;
    activo: boolean;
}

export class NewProductDto {
    idProducto: string;
    idCategoria: string;
    idSubCategoria: string;
    idMarca: string;
    nombre: string;
    precio: number;
    idColor: string;
    descripcion: string;
    imagen: string;
    destacado: boolean;
    nuevo: boolean;
    masVendido: boolean;
    activo: boolean;
    userId: string;
}

export class CategorieDto {
    idCategoria: string;
    categoria: string;
    userId: string;
    created_at: Date
    updated_at: Date;
}

export class SubCategorieDto {
    idSubCategoria: string;
    subCategoria: string;
    userId: string;
    created_at: Date
    updated_at: Date;
}

export class MarcaDto {
    idMarca: string;
    marca: string;
    userId: string;
    created_at: Date
    updated_at: Date;
}

export class ColorDto {
    idColor: string;
    color: string;
    userId: string;
    created_at: Date
    updated_at: Date;
}