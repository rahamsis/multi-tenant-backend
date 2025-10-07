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
    idColor: string;
    nombre: string;
    precio: number;
    cantidad: number;
    descripcion: string;
    destacado: boolean;
    nuevo: boolean;
    masVendido: boolean;
    activo: boolean;
    userId: string;
    fotoDeleted: FotoDeleted[];
    rutaCloudinary: string;
    nuevaRutaCloudinary: string;

    tipo: number;
    packItemsToAdd?: ProductPackItemDto[];
    packItemsToRemove?: ProductPackItemDto[];
    packItemsToUpdate?: ProductPackItemDto[];
}

export class FotoDeleted {
    idFoto: string;
    isPrincipal: boolean;
}

export class ProductPackItemDto {
    idProductoPaquete?: string;
    idPaquete?: string;
    idProducto?: string;
    cantidad?: number;
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
    idCategoria: string;
    created_at: Date
    updated_at: Date;
}

export class MarcaDto {
    idMarca: string;
    marca: string;
    urlFoto: string;
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

export class MenuDto {
    idmenu: string;
    urlMenu: string;
    titulo: string;
    idCategoria: string;
    userId: string;
    orden: number;
    estado: boolean;
}

export class WebSite {
    idEmpresa: string;
    nombre: string;
    telefonoPrincipal: string;
    telefonoSecundario: string;
    direccionPrincipal: string;
    direccionSecundaria: string;
    correo: string;
    userId: string;
}

export class NewAttributeDto {
    newAttribute: string;
    idAttribute: string;
    userId: string;
}