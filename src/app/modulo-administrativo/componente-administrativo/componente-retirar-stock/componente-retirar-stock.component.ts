import { Component } from '@angular/core';
import { StockService } from '../../../services/servicio-stock/stock.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-componente-retirar-stock',
  templateUrl: './componente-retirar-stock.component.html',
  styleUrls: ['./componente-retirar-stock.component.css'],
})
export class ComponenteRetirarStockComponent {
  dtOptions: DataTables.Settings = {};
  codigoAlmacen: string = '';
  almacen: any;
  materiales: any[] = [];
  materialesRetirados: { nombre: string; cantidad: number }[] = [];

  constructor(private stockService: StockService) {}

  ngOnInit() {
    this.initDataTable();
  }

  initDataTable() {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      lengthMenu: [5, 10, 25, 50, 100],
      processing: true,
      responsive: true,
      searching: false,
      ordering: true,
      info: true,
      autoWidth: false,
      columns: [
        { title: 'Nombre', data: 'nombre_producto_hospital' },
        { title: 'Cantidad', data: 'existencias' },
        { title: 'Acciones', data: '' },
      ],
      columnDefs: [
        {
          targets: -1,
          orderable: false,
          render: (data, type, row, meta) => {
            return (
              '<button class="btn btn-primary" onclick="abrirModal(' +
              meta.row +
              ')">Ver Detalles</button>'
            );
          },
        },
      ],
    };
  }

  buscarAlmacenPorCodigo(): void {
    if (this.codigoAlmacen) {
      this.stockService.buscarAlmacenPorCodigo(this.codigoAlmacen).subscribe(
        (response: any) => {
          console.log('Datos recibidos desde Laravel:', response); // Imprimir datos recibidos
          if (response.existe) {
            this.almacen = response.almacen;
            this.materiales = response.materiales;
          } else {
            console.error('El código de almacén no fue encontrado.');
            this.almacen = null;
            this.materiales = [];
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: response.error.mensaje,
              confirmButtonText: 'Introducir código',
            });
          }
        },
        (error) => {
          console.error(error);
          Swal.fire({
            icon: 'error',
            title: 'Oops... código incorrecto',
            text: 'Prueba con otro código de almacén',
          });
        }
      );
    } else {
      console.error('Debe ingresar un código de almacén.');
    }
  }

  abrirModal(material: any): void {
    if (material && material.nombre_producto_hospital) {
      const cantidadMaxima = material.existencias;
      Swal.fire({
        title: 'Detalles del Material',
        html: `
                <div>
                    <p>Nombre: <strong>${material.nombre_producto_hospital}</strong></p>
                    <p>Cantidad: <strong>${material.existencias}</strong></p>
                    <input type="number" id="cantidad-${material.id_material}" class="swal2-input" placeholder="Introduce la cantidad" min="1" max="${cantidadMaxima}">
                </div>
            `,
        showCancelButton: true,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true,
        preConfirm: () => {
          const cantidadInput = document.getElementById(
            `cantidad-${material.id_material}`
          ) as HTMLInputElement;
          const cantidad = parseInt(cantidadInput.value, 10);
          if (cantidad > cantidadMaxima) {
            Swal.fire({
              icon: 'error',
              title: 'Cantidad excedida',
              text: `La cantidad ingresada es mayor que la cantidad disponible (${material.existencias} existencias)`,
              confirmButtonText: 'Introducir otra cantidad',
            });
            return false; // Evita que se cierre el modal
          }
          if (cantidad > 0) {
            this.agregarMaterial(material.nombre_producto_hospital, cantidad);
          }
          return true; // Devuelve true si la cantidad es válida
        },
      });
    } else {
      console.error('El material seleccionado es inválido.');
    }
  }

  agregarMaterial(nombre: string, cantidad: number): void {
    // Verificar si el material ya está en la lista de materiales retirados
    const materialExistente = this.materialesRetirados.find(material => material.nombre === nombre);

    if (materialExistente) {
        // Si el material ya existe, simplemente actualiza la cantidad
        materialExistente.cantidad += cantidad;
    } else {
        // Si el material no existe, agrégalo a la lista
        this.materialesRetirados.push({ nombre, cantidad });
    }

    console.log('Material retirado agregado o actualizado:', this.materialesRetirados);
}


  eliminarMaterial(material: { nombre: string; cantidad: number }): void {
    const index = this.materialesRetirados.findIndex(
      (m) => m.nombre === material.nombre
    );
    if (index !== -1) {
      this.materialesRetirados.splice(index, 1);
      console.log('Material retirado eliminado:', this.materialesRetirados);
    }
  }

  consultarYActualizarExistencias(): void {
    // Verificar si hay algún material retirado
    if (this.materialesRetirados.length === 0) {
      console.error('No hay materiales retirados para actualizar existencias.');
      return; // Salir de la función si no hay materiales retirados
    }

    // Construir un arreglo de materiales retirados
    const materialesParaActualizar = this.materialesRetirados.map(
      (material) => {
        const materialEncontrado = this.materiales.find(
          (m) => m.nombre_producto_hospital === material.nombre
        );
        return {
          id_material: materialEncontrado.id_material,
          cantidad: material.cantidad,
        };
      }
    );

    // Mostrar la información de los materiales que se van a retirar en la consola
    console.log('Materiales a retirar:', materialesParaActualizar);

    // Realizar la llamada al servicio para actualizar las existencias
    this.stockService
      .actualizarExistenciasMaterial(materialesParaActualizar)
      .subscribe(
        (response: any) => {
          // Manejar la respuesta del servidor (éxito)
          if (response && response.message) {
            console.log('Existencias actualizadas:', response.message);
            // Mostrar el modal de SweetAlert
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "Existencias actualizadas",
              showConfirmButton: false,
              timer: 1500
            }).then(() => {
              // Recargar la página después de cerrar el modal
              location.reload();
            });
          } else {
            console.error('Error al actualizar existencias:', response);
            // Puedes mostrar una notificación de error al usuario aquí
          }
        },
        (error) => {
          console.error('Error al actualizar existencias:', error);
          // Puedes mostrar una notificación de error al usuario aquí
        }
      );
}

}
