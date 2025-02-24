# IPFS Wiki Collab Node

El IPFS Wiki Collab Node es la implementación _backend_ para una wiki descentralizada en el ecosistema [IPFS](https://ipfs.tech). Haciendo uso de tecnologías como [OrbitDB](https://github.com/orbitdb/orbitdb) para la base de datos y [LibP2P](https://github.com/libp2p/js-libp2p) para la comunicación peer-to-peer entre colaboradores.

La implementación se centra en lograr una alternativa descentralizada, distribuída y colaborativa a wikis existentes. Es por esto que son únicamente los nodos colaborativos los que se encargan de la disponibilidad y persistencia de la wiki.

Para lograr una verdadera descentralización, todos los nodos que conforman la wiki tienen la misma responsabilidad y es muy fácil crear o mantener una wiki distinta a la provista por Bitxenia. Además, ninguna wiki depende de sus creadores.

Es necesario un cliente _frontend_ que siga el protocolo para poder visualizar la wiki. Desde bitxenia proveemos nuestro [cliente](https://github.com/bitxenia/rc).

## Instalación

Clonar y acceder al repositorio
```
git clone git@github.com:bitxenia/ipfs-wiki-collab-node.git
```
```
cd ipfs-wiki-collab-node
```

Instalar las dependencias
```
npm install
```

## Uso

Correr el nodo
```
npm run start
```

## Uso personalizado

El nodo trae por _default_ las configuraciones necesarias para colaborar con la wiki provista por bitxenia, las cuales se encuentran en `config.example.json`.

Para configurar una instancia propia del nodo, por ejemeplo si se desea colaborar con otra instancia de wiki, es necesario modificar los ajustes que se encuentran en el `config.json`.
Creado automáticamente del example en la primera corrida, puede crearse manualmente si se desea.

Las configuraciones son las siguientes:

- `wiki_name`
  - Default: `bitxenia-wiki`
  - El nombre de la wiki va a determinar a que wiki se va a unir el nodo colaborador. Es este setting el necesario para optar colaborar por otra wiki.
 
- `public_ip`
  - Default: `0.0.0.0`
  - Es posible indicar manualmente la ip pública del nodo si no puede encontrarse automáticamente por `libp2p`.

## Documentation

Para entender como funciona la arquitectura de esta implementación, se pueden leer los docs que se encuentran en el repositorio.

## Solución de problemas

- El nodo no puede conectarse
  - Muy probablemente sea un problema de puertos. La implementación de `libp2p` usa `upnp` para abrir puertos automáticamente y encontrar la ip pública, si el modem utilizado es viejo entonces es necesario abrir los puertos manualmente e indicar la ip pública en el `config.json`.
  - Los puertos a abrir manualmente son:
  -   - 4001
      - 4002
      - 4003
   
- - Si esto no funciona entonces probablemente tu ISP esté haciendo un _double nat_ con la conexión. Impidiendo que puedas recibir conexiones. Se puede contactar con el ISP para que le una solución.
